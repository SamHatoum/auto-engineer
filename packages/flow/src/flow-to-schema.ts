import { SpecsSchema } from './schema';
import { z } from 'zod';
import { Flow, Message } from './index';
import { Integration } from './types';
import { globalIntegrationRegistry } from './integration-registry';
import { TypeInfo } from './loader/ts-utils';
import createDebug from 'debug';

function calculateFieldScore(typeInfo: TypeInfo, sampleFields: Set<string>): number {
  const fields = new Set(typeInfo.dataFields ?? []);
  if (fields.size === 0 && sampleFields.size === 0) return 1;
  const intersection = [...fields].filter((f) => sampleFields.has(f)).length;
  const union = new Set([...fields, ...sampleFields]).size || 1;
  return intersection / union;
}

function findBestTypeCandidate(candidates: TypeInfo[], sampleFields: Set<string>): TypeInfo | null {
  let best: TypeInfo | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = calculateFieldScore(candidate, sampleFields);
    const isNewBest =
      score > bestScore || (score === bestScore && best !== null && candidate.stringLiteral < best.stringLiteral);

    if (isNewBest) {
      best = candidate;
      bestScore = score;
    }
  }

  return bestScore >= 0.5 ? best : null;
}

function resolveInferredType(
  typeName: string,
  exampleData: Record<string, unknown>,
  flowTypeMap?: Map<string, TypeInfo>,
  expectedMessageType?: 'command' | 'event' | 'state',
): string {
  if (typeName !== 'InferredType' || flowTypeMap === undefined) return typeName;

  const all = [...flowTypeMap.values()];
  if (all.length === 0) return typeName;

  const preferred = expectedMessageType ? all.filter((t) => t.classification === expectedMessageType) : all;

  const candidates = preferred.length > 0 ? preferred : all;
  const sampleFields = new Set(Object.keys(exampleData));

  if (candidates.length === 1) return candidates[0].stringLiteral;

  const best = findBestTypeCandidate(candidates, sampleFields);
  return best !== null ? best.stringLiteral : typeName;
}

const debugIntegrations = createDebug('flow:getFlows:integrations');
if (typeof debugIntegrations === 'object' && debugIntegrations !== null && 'color' in debugIntegrations) {
  (debugIntegrations as { color: string }).color = '6';
}

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

const extractSchemaType = (
  integration: Integration,
  schemaType: 'Commands' | 'Queries' | 'Reactions',
  messageType: 'command' | 'state' | 'event',
): Message[] => {
  const messages: Message[] = [];
  const schema = integration[schemaType]?.schema;

  if (schema) {
    debugIntegrations(`[extractMessagesFromIntegrations] Found ${schemaType}.schema:`, Object.keys(schema));
    for (const [name, schemaItem] of Object.entries(schema)) {
      if (schemaItem) {
        const fields = zodSchemaToFields(schemaItem);
        debugIntegrations(
          `[extractMessagesFromIntegrations] Creating ${messageType} message '${name}' with fields:`,
          fields,
        );
        if (messageType === 'event') {
          messages.push({
            type: 'event',
            name,
            fields,
            source: 'external',
            metadata: { version: 1 },
          });
        } else if (messageType === 'command') {
          messages.push({
            type: 'command',
            name,
            fields,
            metadata: { version: 1 },
          });
        } else {
          messages.push({
            type: 'state',
            name,
            fields,
            metadata: { version: 1 },
          });
        }
      }
    }
  } else {
    debugIntegrations(`[extractMessagesFromIntegrations] No ${schemaType}.schema found for ${integration.name}`);
  }

  return messages;
};

const extractMessagesFromIntegrations = (integrations: Integration[]): Message[] => {
  const messages: Message[] = [];

  for (const integration of integrations) {
    debugIntegrations('Processing integration for message extraction: %s', integration.name);

    messages.push(...extractSchemaType(integration, 'Commands', 'command'));
    messages.push(...extractSchemaType(integration, 'Queries', 'state'));
    messages.push(...extractSchemaType(integration, 'Reactions', 'event'));
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

function mapKindToMessageType(k: 'command' | 'query' | 'reaction'): 'command' | 'event' | 'state' {
  if (k === 'command') return 'command';
  if (k === 'query') return 'state';
  return 'event';
}

function addIntegrationToMap(
  integrations: Map<string, { name: string; description?: string; source: string }>,
  system: string,
): void {
  if (!integrations.has(system)) {
    integrations.set(system, {
      name: system,
      description: `${system} integration`,
      source: `@auto-engineer/${system.toLowerCase()}-integration`,
    });
  }
}

function processDestinationMessage(
  message: unknown,
  messages: Map<string, Message>,
  createMessage: (name: string, data: Record<string, unknown>, messageType: 'command' | 'event' | 'state') => Message,
): void {
  if (typeof message === 'object' && message !== null && 'name' in message && 'type' in message) {
    const typedMessage = message as { name: unknown; type: unknown };
    if (typeof typedMessage.name === 'string' && typeof typedMessage.type === 'string') {
      const messageType = typedMessage.type as 'command' | 'query' | 'reaction';
      const mappedType = mapKindToMessageType(messageType);
      if (!messages.has(typedMessage.name)) {
        messages.set(typedMessage.name, createMessage(typedMessage.name, {}, mappedType));
      }
    }
  }
}

function hasDestination(d: unknown): d is { destination: unknown } {
  return typeof d === 'object' && d !== null && 'destination' in d;
}

function hasOrigin(d: unknown): d is { origin: unknown } {
  return typeof d === 'object' && d !== null && 'origin' in d;
}

function hasWithState(d: unknown): d is { _withState: unknown } {
  return typeof d === 'object' && d !== null && '_withState' in d;
}

function isValidIntegration(
  integration: unknown,
): integration is { type: 'integration'; systems: string[]; message?: unknown } {
  return (
    typeof integration === 'object' &&
    integration !== null &&
    'type' in integration &&
    integration.type === 'integration' &&
    'systems' in integration &&
    Array.isArray(integration.systems)
  );
}

function processDestination(
  d: { destination: unknown },
  integrations: Map<string, { name: string; description?: string; source: string }>,
  messages: Map<string, Message>,
  createMessage: (name: string, data: Record<string, unknown>, messageType: 'command' | 'event' | 'state') => Message,
): void {
  if (isValidIntegration(d.destination)) {
    d.destination.systems.forEach((system: string) => {
      addIntegrationToMap(integrations, system);
      if (
        typeof d.destination === 'object' &&
        d.destination !== null &&
        'message' in d.destination &&
        d.destination.message !== null
      ) {
        processDestinationMessage(d.destination.message, messages, createMessage);
      }
    });
  }
}

function processOrigin(
  d: { origin: unknown },
  integrations: Map<string, { name: string; description?: string; source: string }>,
): void {
  if (isValidIntegration(d.origin)) {
    d.origin.systems.forEach((system: string) => {
      addIntegrationToMap(integrations, system);
    });
  }
}

function processWithStateOrigin(
  d: { _withState: unknown },
  integrations: Map<string, { name: string; description?: string; source: string }>,
): void {
  if (typeof d._withState === 'object' && d._withState !== null && 'origin' in d._withState) {
    const withState = d._withState as { origin: unknown };
    if (isValidIntegration(withState.origin)) {
      withState.origin.systems.forEach((system: string) => {
        addIntegrationToMap(integrations, system);
      });
    }
  }
}

function processDataItemIntegrations(
  d: unknown,
  integrations: Map<string, { name: string; description?: string; source: string }>,
  messages: Map<string, Message>,
  createMessage: (name: string, data: Record<string, unknown>, messageType: 'command' | 'event' | 'state') => Message,
): void {
  if (hasDestination(d)) {
    processDestination(d, integrations, messages, createMessage);
  }

  if (hasOrigin(d)) {
    processOrigin(d, integrations);
  }

  if (hasWithState(d)) {
    processWithStateOrigin(d, integrations);
  }
}

export const flowsToSchema = (
  flows: Flow[],
  typeMap?: Map<string, string>,
  typesByFile?: Map<string, Map<string, TypeInfo>>,
): z.infer<typeof SpecsSchema> => {
  const messages = new Map<string, Message>();
  const integrations = new Map<
    string,
    {
      name: string;
      description?: string;
      source: string;
    }
  >();

  // Pull messages defined by registered integrations first
  const registeredIntegrations = globalIntegrationRegistry.getAll();
  const integrationMessages = extractMessagesFromIntegrations(registeredIntegrations);
  for (const msg of integrationMessages) {
    if (!messages.has(msg.name)) messages.set(msg.name, msg);
  }

  // Build a union of all discovered types (global fallback across files)
  const unionTypes: Map<string, TypeInfo> | undefined = (() => {
    if (!typesByFile) return undefined;
    const u = new Map<string, TypeInfo>();
    for (const [, m] of typesByFile) for (const [k, v] of m) u.set(k, v);
    return u.size ? u : undefined;
  })();

  // check if filename matches flow patterns
  const matchesFlowPattern = (fileName: string, flowName: string): boolean => {
    const flowNameLower = flowName.toLowerCase();
    const patterns = [
      flowNameLower.replace(/\s+/g, '-'),
      flowNameLower.replace(/\s+/g, ''),
      flowNameLower.replace(/\s+/g, '_'),
      flowNameLower,
    ];

    return patterns.some((pattern) => fileName.includes(pattern));
  };

  // pick the best map for a given flow
  const getFlowSpecificTypes = (flow: Flow): Map<string, TypeInfo> | undefined => {
    if (!typesByFile) return undefined;

    // 1) Exact source file (recorded by startFlow via runtime)
    const sf = (flow as Record<string, unknown>).sourceFile as string | undefined;
    if (typeof sf === 'string') {
      const exact = typesByFile.get(sf) || typesByFile.get(sf.replace(/\\/g, '/'));
      if (exact && exact.size > 0) return exact;
    }

    // 2) Heuristic by filename
    for (const [filePath, fileTypes] of typesByFile) {
      const fileName = filePath.toLowerCase();
      if (matchesFlowPattern(fileName, flow.name)) {
        return fileTypes;
      }
    }

    // 3) No per-flow map: the caller will fall back to union/global
    return undefined;
  };

  flows.forEach((flow) => {
    const flowSpecificTypes = getFlowSpecificTypes(flow);

    const resolveType = (
      t: string,
      data: Record<string, unknown>,
      expected?: 'command' | 'event' | 'state',
    ): string => {
      if (flowSpecificTypes) return resolveInferredType(t, data, flowSpecificTypes, expected);
      if (unionTypes) return resolveInferredType(t, data, unionTypes, expected);
      if (typeMap) {
        const legacy = new Map<string, TypeInfo>();
        for (const [k, v] of typeMap) legacy.set(k, { stringLiteral: v });
        return resolveInferredType(t, data, legacy, expected);
      }
      return t;
    };

    flow.slices.forEach((slice) => {
      // Extract messages from server specs (Given/When/Then)
      if ('server' in slice && slice.server?.specs !== undefined) {
        const spec = slice.server.specs;
        spec.rules.forEach((rule) => {
          rule.examples.forEach((example) => {
            // given
            if (example.given) {
              example.given.forEach((g) => {
                if ('eventRef' in g) {
                  const r = resolveType(g.eventRef, g.exampleData, 'event');
                  g.eventRef = r;
                  const msg = createMessage(r, g.exampleData, 'event');
                  const existing = messages.get(r);
                  if (!existing || msg.fields.length > existing.fields.length) messages.set(r, msg);
                }
                if ('stateRef' in g) {
                  const r = resolveType(g.stateRef, g.exampleData, 'state');
                  g.stateRef = r;
                  const msg = createMessage(r, g.exampleData, 'state');
                  const existing = messages.get(r);
                  if (!existing || msg.fields.length > existing.fields.length) messages.set(r, msg);
                }
              });
            }

            // when
            if ('commandRef' in example.when) {
              const expected = slice.type === 'command' ? 'command' : 'event';
              const r = resolveType(example.when.commandRef, example.when.exampleData, expected);
              example.when.commandRef = r;
              const messageType = slice.type === 'command' ? 'command' : 'event';
              const msg = createMessage(r, example.when.exampleData, messageType);
              const existing = messages.get(r);
              if (!existing || msg.fields.length > existing.fields.length) messages.set(r, msg);
            } else if (Array.isArray(example.when)) {
              example.when.forEach((ev) => {
                const r = resolveType(ev.eventRef, ev.exampleData, 'event');
                ev.eventRef = r;
                const msg = createMessage(r, ev.exampleData, 'event');
                const existing = messages.get(r);
                if (!existing || msg.fields.length > existing.fields.length) messages.set(r, msg);
              });
            }

            // then
            if (Array.isArray(example.then) && example.then.length > 0) {
              example.then.forEach((t) => {
                if ('eventRef' in t) {
                  const r = resolveType(t.eventRef, t.exampleData, 'event');
                  t.eventRef = r;
                  const msg = createMessage(r, t.exampleData, 'event');
                  const existing = messages.get(r);
                  if (!existing || msg.fields.length > existing.fields.length) messages.set(r, msg);
                } else if ('commandRef' in t) {
                  const r = resolveType(t.commandRef, t.exampleData, 'command');
                  t.commandRef = r;
                  const msg = createMessage(r, t.exampleData, 'command');
                  const existing = messages.get(r);
                  if (!existing || msg.fields.length > existing.fields.length) messages.set(r, msg);
                } else if ('stateRef' in t) {
                  const r = resolveType(t.stateRef, t.exampleData, 'state');
                  t.stateRef = r;
                  const msg = createMessage(r, t.exampleData, 'state');
                  const existing = messages.get(r);
                  if (!existing || msg.fields.length > existing.fields.length) messages.set(r, msg);
                }
              });
            }
          });
        });
      }

      // Integrations: from data & via
      if ('server' in slice && slice.server?.data !== undefined) {
        slice.server.data.forEach((d) => {
          processDataItemIntegrations(d, integrations, messages, createMessage);
        });
      }

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

  // Ensure all registered integrations are listed
  for (const integration of registeredIntegrations) {
    if (!integrations.has(integration.name)) {
      integrations.set(integration.name, {
        name: integration.name,
        description: `${integration.name} integration`,
        source: `@auto-engineer/${integration.name.toLowerCase()}-integration`,
      });
    }
  }

  return {
    variant: 'specs' as const,
    flows,
    messages: Array.from(messages.values()),
    integrations: Array.from(integrations.values()),
  };
};
