import { SpecsSchema } from '../schema';
import { z } from 'zod';
import { Flow, Message } from '../index';
import { messageRegistry } from '../message-registry';
import { Integration } from '../types';
import { globalIntegrationRegistry } from '../integration-registry';
import createDebug from 'debug';

const debugIntegrations = createDebug('flowlang:getFlows:integrations');
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

export const flowsToSchema = (flows: Flow[]): z.infer<typeof SpecsSchema> => {
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

  // FIRST: Add all declared messages from messageRegistry
  for (const msg of messageRegistry.getAll()) {
    messages.set(msg.name, msg);
  }

  // SECOND: Add messages from integration schemas
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
    flow.slices.forEach((slice) => {
      // Extract messages from GWT specs
      if ('server' in slice && slice.server?.gwt !== undefined) {
        slice.server.gwt.forEach((gwt) => {
          // Process given
          if ('given' in gwt && gwt.given) {
            // eslint-disable-next-line complexity
            gwt.given.forEach((item) => {
              // Handle flow builder format (type + data)
              if ('type' in item && '__messageCategory' in item) {
                const messageCategory = item.__messageCategory;
                const messageType =
                  messageCategory === 'event' ? 'event' : messageCategory === 'command' ? 'command' : 'state';
                const gwtMessage = createMessage(item.type as string, item.exampleData, messageType);
                const existingMessage = messages.get(item.type as string);
                if (!existingMessage || gwtMessage.fields.length > existingMessage.fields.length) {
                  messages.set(item.type as string, gwtMessage);
                }
              }
              if ('eventRef' in item) {
                const gwtMessage = createMessage(item.eventRef, item.exampleData, 'event');
                const existingMessage = messages.get(item.eventRef);
                if (!existingMessage || gwtMessage.fields.length > existingMessage.fields.length) {
                  messages.set(item.eventRef, gwtMessage);
                }
              }
              if ('stateRef' in item) {
                const gwtMessage = createMessage(item.stateRef as string, item.exampleData, 'state');
                const existingMessage = messages.get(item.stateRef as string);
                if (!existingMessage || gwtMessage.fields.length > existingMessage.fields.length) {
                  messages.set(item.stateRef as string, gwtMessage);
                }
              }
            });
          }

          // Process when
          if ('when' in gwt) {
            if ('commandRef' in gwt.when) {
              // Command slice
              const gwtMessage = createMessage(gwt.when.commandRef, gwt.when.exampleData, 'command');
              const existingMessage = messages.get(gwt.when.commandRef);
              if (!existingMessage || gwtMessage.fields.length > existingMessage.fields.length) {
                messages.set(gwt.when.commandRef, gwtMessage);
              }
            } else if (Array.isArray(gwt.when)) {
              // React slice
              gwt.when.forEach((event) => {
                const gwtMessage = createMessage(event.eventRef, event.exampleData, 'event');
                const existingMessage = messages.get(event.eventRef);
                if (!existingMessage || gwtMessage.fields.length > existingMessage.fields.length) {
                  messages.set(event.eventRef, gwtMessage);
                }
              });
            }
          }

          // Process then
          if ('then' in gwt && gwt.then !== undefined) {
            gwt.then.forEach((item) => {
              if ('eventRef' in item) {
                const gwtMessage = createMessage(item.eventRef, item.exampleData, 'event');
                const existingMessage = messages.get(item.eventRef);
                if (!existingMessage || gwtMessage.fields.length > existingMessage.fields.length) {
                  messages.set(item.eventRef, gwtMessage);
                }
              } else if ('commandRef' in item) {
                const gwtMessage = createMessage(item.commandRef, item.exampleData, 'command');
                const existingMessage = messages.get(item.commandRef);
                if (!existingMessage || gwtMessage.fields.length > existingMessage.fields.length) {
                  messages.set(item.commandRef, gwtMessage);
                }
              } else if ('stateRef' in item) {
                const gwtMessage = createMessage(item.stateRef, item.exampleData, 'state');
                const existingMessage = messages.get(item.stateRef);
                if (!existingMessage || gwtMessage.fields.length > existingMessage.fields.length) {
                  messages.set(item.stateRef, gwtMessage);
                }
              }
            });
          }
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
