import { SpecsSchema } from './schema';
import { z } from 'zod';
import { Flow, Message } from './index';
import { Integration } from './types';
import { globalIntegrationRegistry } from './integration-registry';
import { TypeInfo } from './loader/ts-utils';
import createDebug from 'debug';

// resolve InferredType placeholders using semantic type analysis
function resolveInferredType(
  typeName: string,
  exampleData: Record<string, unknown>,
  flowTypeMap?: Map<string, TypeInfo>,
  expectedMessageType?: 'command' | 'event' | 'state',
): string {
  // If not an inferred type, return as-is
  if (typeName !== 'InferredType' || !flowTypeMap) {
    return typeName;
  }

  // Strategy: Use the semantic information from TypeScript analysis
  // to find the type that matches the expected message type

  // First, try to find a type with explicit classification from type alias analysis
  for (const [, typeInfo] of flowTypeMap) {
    if (typeInfo.classification === expectedMessageType) {
      return typeInfo.stringLiteral;
    }
  }

  // If no explicit classification, analyze the data structure compatibility
  const exampleDataFields = Object.keys(exampleData);

  // Find the type whose data structure best matches the example data
  for (const [, typeInfo] of flowTypeMap) {
    if (typeInfo.dataFields && typeInfo.dataFields.length > 0) {
      // Check how well the type's data fields match the example data
      const matchingFields = typeInfo.dataFields.filter((field) => exampleDataFields.includes(field));
      const matchRatio = matchingFields.length / Math.max(typeInfo.dataFields.length, exampleDataFields.length);

      // If we have a good match, use this type
      if (matchRatio > 0.5) {
        return typeInfo.stringLiteral;
      }
    }
  }

  // Fallback: use the first available type
  for (const [, typeInfo] of flowTypeMap) {
    return typeInfo.stringLiteral;
  }

  return typeName;
}

const debugIntegrations = createDebug('flow:getFlows:integrations');
if ('color' in debugIntegrations && typeof debugIntegrations === 'object') {
  (debugIntegrations as { color: string }).color = '6';
} // cyan

// Helper function to extract Zod schema type information
const extractZodType = (schema: z.ZodTypeAny): string => {
  const def = schema._def as { typeName?: string };
  const typeName = def.typeName;

  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodDate':
      return 'Date';
    case 'ZodOptional':
      return extractZodType((schema as z.ZodOptional<z.ZodTypeAny>)._def.innerType);
    case 'ZodNullable': {
      const innerType = extractZodType((schema as z.ZodNullable<z.ZodTypeAny>)._def.innerType);
      return `${innerType} | null`;
    }
    case 'ZodArray': {
      const elementType = extractZodType((schema as z.ZodArray<z.ZodTypeAny>)._def.type);
      return `Array<${elementType}>`;
    }
    case 'ZodObject': {
      const shape = (schema as z.ZodObject<z.ZodRawShape>)._def.shape();
      const entries = Object.entries(shape)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        .map(([key, val]) => `${key}: ${extractZodType(val as z.ZodTypeAny)}`)
        .join(', ');
      return `{${entries}}`;
    }
    default:
      return 'unknown';
  }
};

// Convert Zod schema to Message fields
const zodSchemaToFields = (schema: z.ZodTypeAny): Message['fields'] => {
  const def = schema._def as { typeName?: string };
  if (def.typeName !== 'ZodObject') {
    return [];
  }

  const shape = (schema as z.ZodObject<z.ZodRawShape>)._def.shape();
  return Object.entries(shape).map(([name, field]) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const zodField = field as z.ZodTypeAny;
    const fieldDef = zodField._def as { typeName?: string };
    const isOptional = fieldDef.typeName === 'ZodOptional';

    return {
      name,
      type: extractZodType(zodField),
      required: !isOptional,
    };
  });
};

// Extract messages from integration schemas
// eslint-disable-next-line complexity
const extractMessagesFromIntegrations = (integrations: Integration[]): Message[] => {
  const messages: Message[] = [];

  for (const integration of integrations) {
    debugIntegrations('Processing integration for message extraction: %s', integration.name);

    // Extract command schemas
    if (integration.Commands?.schema) {
      debugIntegrations(
        `[extractMessagesFromIntegrations] Found Commands.schema:`,
        Object.keys(integration.Commands.schema),
      );
      for (const [name, schema] of Object.entries(integration.Commands.schema)) {
        if (schema) {
          const fields = zodSchemaToFields(schema);
          debugIntegrations(
            `[extractMessagesFromIntegrations] Creating command message '${name}' with fields:`,
            fields,
          );
          messages.push({
            type: 'command',
            name,
            fields,
            metadata: { version: 1 },
          });
        }
      }
    } else {
      debugIntegrations(`[extractMessagesFromIntegrations] No Commands.schema found for ${integration.name}`);
    }

    // Extract query schemas (these become state messages)
    if (integration.Queries?.schema) {
      debugIntegrations(
        `[extractMessagesFromIntegrations] Found Queries.schema:`,
        Object.keys(integration.Queries.schema),
      );
      for (const [name, schema] of Object.entries(integration.Queries.schema)) {
        if (schema) {
          const fields = zodSchemaToFields(schema);
          debugIntegrations(`[extractMessagesFromIntegrations] Creating state message '${name}' with fields:`, fields);
          messages.push({
            type: 'state',
            name,
            fields,
            metadata: { version: 1 },
          });
        }
      }
    } else {
      debugIntegrations(`[extractMessagesFromIntegrations] No Queries.schema found for ${integration.name}`);
    }

    // Extract reaction schemas (these become event messages)
    if (integration.Reactions?.schema) {
      debugIntegrations(
        `[extractMessagesFromIntegrations] Found Reactions.schema:`,
        Object.keys(integration.Reactions.schema),
      );
      for (const [name, schema] of Object.entries(integration.Reactions.schema)) {
        if (schema) {
          const fields = zodSchemaToFields(schema);
          debugIntegrations(`[extractMessagesFromIntegrations] Creating event message '${name}' with fields:`, fields);
          messages.push({
            type: 'event',
            name,
            fields,
            source: 'external',
            metadata: { version: 1 },
          });
        }
      }
    } else {
      debugIntegrations(`[extractMessagesFromIntegrations] No Reactions.schema found for ${integration.name}`);
    }
  }

  return messages;
};

const createMessage = (
  name: string,
  data: Record<string, unknown>,
  messageType: 'command' | 'event' | 'state',
): Message => {
  // Infer fields from example data
  const fields = Object.entries(data).map(([fieldName, value]) => ({
    name: fieldName,
    type: inferType(value),
    required: true,
    description: undefined,
    defaultValue: undefined,
  }));

  const metadata = { version: 1 };

  if (messageType === 'event') {
    return {
      type: 'event',
      name,
      fields,
      source: 'internal',
      metadata,
    };
  }

  if (messageType === 'command') {
    return {
      type: 'command',
      name,
      fields,
      metadata,
    };
  }

  return {
    type: 'state',
    name,
    fields,
    metadata,
  };
};

const inferType = (value: unknown): string => {
  if (value === null || value === undefined) return 'unknown';

  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
    return 'Date';
  }

  if (Array.isArray(value)) {
    return inferArrayType(value);
  }

  if (typeof value === 'object') {
    return inferObjectType(value as Record<string, unknown>);
  }

  return typeof value;
};

const inferArrayType = (value: unknown[]): string => {
  if (value.length === 0) return 'Array<unknown>';
  const itemType = inferType(value[0]);
  if (typeof value[0] === 'object' && !Array.isArray(value[0])) {
    const objType = Object.entries(value[0] as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${inferType(v)}`)
      .join(', ');
    return `Array<{${objType}}>`;
  }
  return `Array<${itemType}>`;
};

const inferObjectType = (value: Record<string, unknown>): string => {
  const objType = Object.entries(value)
    .map(([k, v]) => `${k}: ${inferType(v)}`)
    .join(', ');
  return `{${objType}}`;
};

// get flow-specific types for a flow
function getFlowSpecificTypes(
  flow: Flow,
  typesByFile?: Map<string, Map<string, TypeInfo>>,
): Map<string, TypeInfo> | undefined {
  // If we don't have file-based types, fall back to global typeMap
  if (!typesByFile) {
    return undefined;
  }

  // Try to find the source file for this flow
  // Look for files that might contain this flow
  for (const [filePath, fileTypes] of typesByFile) {
    // Check if this file likely contains the flow based on naming patterns
    const flowNameLower = flow.name.toLowerCase().replace(/\s+/g, '-');
    const fileName = filePath.toLowerCase();

    // Try multiple matching strategies
    if (
      fileName.includes(flowNameLower) ||
      fileName.includes(flow.name.toLowerCase()) ||
      fileName.includes(flow.name.toLowerCase().replace(/\s+/g, '')) || // "place order" -> "placeorder"
      fileName.includes(flow.name.toLowerCase().replace(/\s+/g, '_'))
    ) {
      // "place order" -> "place_order"
      return fileTypes;
    }
  }

  // If no specific file found, return the first available file types as fallback
  // This ensures we don't cross-contaminate between flows
  const fileEntries = Array.from(typesByFile.entries());
  if (fileEntries.length > 0) {
    return fileEntries[0][1];
  }

  return undefined;
}

export const flowsToSchema = (
  flows: Flow[],
  typeMap?: Map<string, string>,
  typesByFile?: Map<string, Map<string, TypeInfo>>,
): z.infer<typeof SpecsSchema> => {
  // Extract messages and integrations from flows
  const messages = new Map<string, Message>();
  const integrations = new Map<
    string,
    {
      name: string;
      description?: string;
      source: string;
    }
  >();

  // Add messages from integration schemas
  const registeredIntegrations = globalIntegrationRegistry.getAll();
  debugIntegrations(
    `[flowsToSchema] Found ${registeredIntegrations.length} registered integrations:`,
    registeredIntegrations.map((i) => i.name),
  );
  const integrationMessages = extractMessagesFromIntegrations(registeredIntegrations);
  debugIntegrations(`[flowsToSchema] Extracted ${integrationMessages.length} messages from integrations`);
  for (const msg of integrationMessages) {
    if (!messages.has(msg.name)) {
      messages.set(msg.name, msg);
      debugIntegrations(`[flowsToSchema] Added integration message: ${msg.name} (${msg.type})`);
    }
  }

  flows.forEach((flow) => {
    // Get flow-specific types, with fallback logic
    const flowSpecificTypes = getFlowSpecificTypes(flow, typesByFile);

    // Helper function to resolve InferredType with proper fallback
    const resolveType = (
      typeName: string,
      exampleData: Record<string, unknown>,
      expectedMessageType?: 'command' | 'event' | 'state',
    ): string => {
      if (flowSpecificTypes) {
        return resolveInferredType(typeName, exampleData, flowSpecificTypes, expectedMessageType);
      } else if (typeMap) {
        // Fallback to global typeMap - convert to TypeInfo format on the fly
        const legacyMap = new Map<string, TypeInfo>();
        for (const [key, value] of typeMap) {
          legacyMap.set(key, { stringLiteral: value });
        }
        return resolveInferredType(typeName, exampleData, legacyMap, expectedMessageType);
      } else {
        return typeName;
      }
    };

    flow.slices.forEach((slice) => {
      // Extract messages from new specs structure
      if ('server' in slice && slice.server?.specs !== undefined) {
        const spec = slice.server.specs;
        spec.rules.forEach((rule) => {
          rule.examples.forEach((example) => {
            // Process given
            if (example.given) {
              example.given.forEach((item) => {
                if ('eventRef' in item) {
                  const resolvedEventRef = resolveType(item.eventRef, item.exampleData, 'event');
                  item.eventRef = resolvedEventRef;
                  const message = createMessage(resolvedEventRef, item.exampleData, 'event');
                  const existingMessage = messages.get(resolvedEventRef);
                  if (!existingMessage || message.fields.length > existingMessage.fields.length) {
                    messages.set(resolvedEventRef, message);
                  }
                }
                if ('stateRef' in item) {
                  const resolvedStateRef = resolveType(item.stateRef, item.exampleData, 'state');
                  item.stateRef = resolvedStateRef;
                  const message = createMessage(resolvedStateRef, item.exampleData, 'state');
                  const existingMessage = messages.get(resolvedStateRef);
                  if (!existingMessage || message.fields.length > existingMessage.fields.length) {
                    messages.set(resolvedStateRef, message);
                  }
                }
              });
            }

            // Process when
            if ('commandRef' in example.when) {
              // Command slice - resolve InferredType if needed
              const expectedType = slice.type === 'command' ? 'command' : 'event';
              const resolvedCommandRef = resolveType(example.when.commandRef, example.when.exampleData, expectedType);
              // Update the example with the resolved type
              example.when.commandRef = resolvedCommandRef;
              const messageType = slice.type === 'command' ? 'command' : 'event';
              const message = createMessage(resolvedCommandRef, example.when.exampleData, messageType);
              const existingMessage = messages.get(resolvedCommandRef);
              if (!existingMessage || message.fields.length > existingMessage.fields.length) {
                messages.set(resolvedCommandRef, message);
              }
            } else if (Array.isArray(example.when)) {
              // React slice or Query slice with array of events
              example.when.forEach((event) => {
                const resolvedEventRef = resolveType(event.eventRef, event.exampleData, 'event');
                event.eventRef = resolvedEventRef;
                const message = createMessage(resolvedEventRef, event.exampleData, 'event');
                const existingMessage = messages.get(resolvedEventRef);
                if (!existingMessage || message.fields.length > existingMessage.fields.length) {
                  messages.set(resolvedEventRef, message);
                }
              });
            }

            // Process then
            if (Array.isArray(example.then) && example.then.length > 0) {
              example.then.forEach((item) => {
                if ('eventRef' in item) {
                  const resolvedEventRef = resolveType(item.eventRef, item.exampleData, 'event');
                  item.eventRef = resolvedEventRef;
                  const message = createMessage(resolvedEventRef, item.exampleData, 'event');
                  const existingMessage = messages.get(resolvedEventRef);
                  if (!existingMessage || message.fields.length > existingMessage.fields.length) {
                    messages.set(resolvedEventRef, message);
                  }
                } else if ('commandRef' in item) {
                  const resolvedCommandRef = resolveType(item.commandRef, item.exampleData, 'command');
                  item.commandRef = resolvedCommandRef;
                  const message = createMessage(resolvedCommandRef, item.exampleData, 'command');
                  const existingMessage = messages.get(resolvedCommandRef);
                  if (!existingMessage || message.fields.length > existingMessage.fields.length) {
                    messages.set(resolvedCommandRef, message);
                  }
                } else if ('stateRef' in item) {
                  const resolvedStateRef = resolveType(item.stateRef, item.exampleData, 'state');
                  item.stateRef = resolvedStateRef;
                  const message = createMessage(resolvedStateRef, item.exampleData, 'state');
                  const existingMessage = messages.get(resolvedStateRef);
                  if (!existingMessage || message.fields.length > existingMessage.fields.length) {
                    messages.set(resolvedStateRef, message);
                  }
                }
              });
            }
          });
        });
      }

      // Extract integrations from data
      if ('server' in slice && slice.server?.data !== undefined) {
        slice.server.data.forEach((dataItem) => {
          if ('destination' in dataItem && dataItem.destination.type === 'integration') {
            dataItem.destination.systems.forEach((system: string) => {
              if (!integrations.has(system)) {
                integrations.set(system, {
                  name: system,
                  description: `${system} integration`,
                  source: `@auto-engineer/${system.toLowerCase()}-integration`,
                });
              }
              if (
                'destination' in dataItem &&
                dataItem.destination.type === 'integration' &&
                'message' in dataItem.destination &&
                dataItem.destination.message
              ) {
                const mapIntegrationTypeToMessageType = (
                  t: 'command' | 'query' | 'reaction',
                ): 'command' | 'event' | 'state' => {
                  switch (t) {
                    case 'command':
                      return 'command';
                    case 'query':
                      return 'state';
                    case 'reaction':
                      return 'event';
                  }
                };
                const msg = dataItem.destination.message;
                if (!messages.has(msg.name)) {
                  messages.set(msg.name, createMessage(msg.name, {}, mapIntegrationTypeToMessageType(msg.type)));
                }
              }
            });
          }
          if ('origin' in dataItem && dataItem.origin?.type === 'integration') {
            dataItem.origin.systems.forEach((system: string) => {
              if (!integrations.has(system)) {
                integrations.set(system, {
                  name: system,
                  description: `${system} integration`,
                  source: `@auto-engineer/${system.toLowerCase()}-integration`,
                });
              }
            });
          }
          if ('_withState' in dataItem && dataItem._withState?.origin?.type === 'integration') {
            dataItem._withState.origin.systems.forEach((system: string) => {
              if (!integrations.has(system)) {
                integrations.set(system, {
                  name: system,
                  description: `${system} integration`,
                  source: `@auto-engineer/${system.toLowerCase()}-integration`,
                });
              }
            });
          }
        });
      }

      // Extract integrations from via
      if ('via' in slice && slice.via) {
        slice.via.forEach((integrationName) => {
          if (!integrations.has(integrationName)) {
            integrations.set(integrationName, {
              name: integrationName,
              description: `${integrationName} integration`,
              source: `@auto-engineer/${integrationName.toLowerCase()}-integration`,
            });
          }
        });
      }
    });
  });

  // Add integrations from registry
  for (const integration of registeredIntegrations) {
    if (!integrations.has(integration.name)) {
      integrations.set(integration.name, {
        name: integration.name,
        description: `${integration.name} integration`,
        source: `@auto-engineer/${integration.name.toLowerCase()}-integration`,
      });
    }
  }

  // Return the properly typed schema
  return {
    variant: 'specs' as const,
    flows: flows,
    messages: Array.from(messages.values()),
    integrations: Array.from(integrations.values()),
  };
};
