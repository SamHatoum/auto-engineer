import { SpecsSchema } from './schema';
import { z } from 'zod';
import { Flow, Message } from './index';
import { Integration } from './types';
import { globalIntegrationRegistry } from './integration-registry';
import { TypeInfo } from './loader/ts-utils';
import createDebug from 'debug';

function tryDataFieldMatch(typeInfo: TypeInfo, dataKeys: Set<string>): boolean {
  const dataField = typeInfo.dataFields?.find((f) => f.name === 'data');
  if (
    dataField &&
    typeof dataField.type === 'string' &&
    dataField.type.startsWith('{') &&
    dataField.type.endsWith('}')
  ) {
    const bodyMatch = dataField.type.match(/^\{\s*([^}]*)\s*\}$/);
    if (bodyMatch && bodyMatch[1]) {
      const body = bodyMatch[1];
      const innerKeys = new Set<string>();
      const re = /(\w+)(\?)?\s*:\s*([^;,]+)(?=[;,]|$)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        innerKeys.add(m[1]);
      }

      return dataKeys.size > 0 && Array.from(dataKeys).every((key) => innerKeys.has(key));
    }
  }
  return false;
}

function tryTopLevelMatch(typeInfo: TypeInfo, dataKeys: Set<string>): boolean {
  if (typeInfo.dataFields && typeInfo.dataFields.length > 0) {
    const typeKeys = new Set(typeInfo.dataFields.map((f) => f.name));
    if (dataKeys.size > 0 && typeKeys.size > 0) {
      return dataKeys.size <= typeKeys.size && Array.from(dataKeys).every((key) => typeKeys.has(key));
    }
  }
  return false;
}

function tryMatchCandidates(candidates: TypeInfo[], dataKeys: Set<string>): string | null {
  for (const typeInfo of candidates) {
    if (typeInfo.dataFields && typeInfo.dataFields.length > 0) {
      if (tryDataFieldMatch(typeInfo, dataKeys) || tryTopLevelMatch(typeInfo, dataKeys)) {
        return typeInfo.stringLiteral;
      }
    }
  }
  return null;
}

// eslint-disable-next-line complexity
function resolveInferredType(
  typeName: string,
  flowTypeMap?: Map<string, TypeInfo>,
  expectedMessageType?: 'command' | 'event' | 'state',
  exampleData?: unknown,
): string {
  if (typeName !== 'InferredType' || flowTypeMap === undefined) return typeName;

  const all = [...flowTypeMap.values()];
  if (all.length === 0) return typeName;

  const candidates = expectedMessageType ? all.filter((t) => t.classification === expectedMessageType) : all;

  if (candidates.length === 1) return candidates[0].stringLiteral;

  if (exampleData !== null && typeof exampleData === 'object' && exampleData !== undefined) {
    const dataKeys = new Set(Object.keys(exampleData));

    const match = tryMatchCandidates(candidates, dataKeys);
    if (match !== null) return match;

    if (expectedMessageType !== undefined) {
      const fallbackMatch = tryMatchCandidates(all, dataKeys);
      if (fallbackMatch !== null) return fallbackMatch;
    }
  }

  return typeName;
}

const debugIntegrations = createDebug('flow:getFlows:integrations');
if (typeof debugIntegrations === 'object' && debugIntegrations !== null && 'color' in debugIntegrations) {
  (debugIntegrations as { color: string }).color = '6';
}

// ---- Inline referenced TS types into structural strings (for round-tripping) ----

function inlineIdentifier(name: string, lookup: Map<string, TypeInfo>, seen = new Set<string>()): string | undefined {
  // avoid infinite recursion on cyclical type graphs
  if (seen.has(name)) return undefined;
  seen.add(name);

  const ti = lookup.get(name);
  if (!ti) return undefined;

  // If the referenced type has object-like fields, inline them as { a: T; b?: U }
  if (Array.isArray(ti.dataFields) && ti.dataFields.length > 0) {
    const parts = ti.dataFields.map((f) => {
      const nested = inlineTypeString(f.type, lookup, seen);
      const typeStr = nested ?? f.type;
      return `${f.name}${f.required ? '' : '?'}: ${typeStr}`;
    });
    return `{ ${parts.join('; ')} }`;
  }

  // If we don't have field info, we can't inline safely
  return undefined;
}

// eslint-disable-next-line complexity
function inlineTypeString(type: string, lookup: Map<string, TypeInfo>, seen = new Set<string>()): string | undefined {
  // Array<T>
  const arr = type.match(/^Array<\s*([^>]+)\s*>$/);
  if (arr) {
    const inner = arr[1].trim();
    const inlinedInner = inlineTypeString(inner, lookup, seen) ?? inlineIdentifier(inner, lookup, seen);
    if (inlinedInner !== undefined && inlinedInner !== null) return `Array<${inlinedInner}>`;
    return undefined;
  }

  // Basic primitives we don't touch
  if (
    type === 'string' ||
    type === 'number' ||
    type === 'boolean' ||
    type === 'Date' ||
    type === 'unknown' ||
    type === 'any'
  ) {
    return undefined;
  }

  // Already structural? (starts with '{' and ends with '}' or looks like a union with null)
  const trimmed = type.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || trimmed.includes('| null')) {
    return undefined; // keep as is
  }

  // Single identifier? Try to inline it
  const ident = type.match(/^[A-Za-z_]\w*$/);
  if (ident) {
    const asObj = inlineIdentifier(type, lookup, seen);
    if (asObj !== undefined) return asObj;
    return undefined;
  }

  // Generic we don't specially handle (Record<...>, etc.) -> leave as-is
  return undefined;
}

function inlineAllMessageFieldTypes(msgs: Map<string, Message>, lookup: Map<string, TypeInfo>): void {
  for (const [, msg] of msgs) {
    if (!Array.isArray(msg.fields)) continue;
    msg.fields = msg.fields.map((f) => {
      const inlined = inlineTypeString(f.type, lookup);
      return inlined !== undefined ? { ...f, type: inlined } : f;
    });
  }
}

// ---- Infer structural field types from exampleData (e.g., Array<Product> -> Array<{ ... }>) ----

type ExampleShapeHints = Map<
  string, // message name, e.g. "Products"
  Map<string, string> // field -> structural type string, e.g. "products" -> "Array<{ ... }>"
>;

function primitiveOf(v: unknown): string {
  if (v === null) return 'null';
  if (v instanceof Date) return 'Date';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  return 'unknown';
}

function typeFromExample(v: unknown): string {
  if (Array.isArray(v)) {
    const inner = v.length ? typeFromExample(v[0]) : 'unknown';
    return `Array<${inner}>`;
  }
  if (v !== null && v !== undefined && typeof v === 'object' && !(v instanceof Date)) {
    const entries = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${typeFromExample(val)}`)
      .join('; ');
    return `{ ${entries} }`;
  }
  return primitiveOf(v);
}

function isStructural(s: string): boolean {
  const t = s.trim();
  return t.startsWith('{') || t.startsWith('Array<{');
}

function shouldApplyExampleShape(currentType: string, exampleType: string): boolean {
  // Prefer structural example over alias-like/non-structural current type
  return !isStructural(currentType) && isStructural(exampleType);
}

function collectExampleHintsForData(msgName: string, exampleData: unknown, hints: ExampleShapeHints) {
  if (exampleData === null || exampleData === undefined || typeof exampleData !== 'object') return;
  const byField = hints.get(msgName) ?? new Map<string, string>();
  for (const [k, v] of Object.entries(exampleData as Record<string, unknown>)) {
    const inferred = typeFromExample(v);
    const existing = byField.get(k);
    if (existing === undefined || shouldApplyExampleShape(existing, inferred)) {
      byField.set(k, inferred);
    }
  }
  hints.set(msgName, byField);
}

function applyExampleShapeHints(msgs: Map<string, Message>, hints: ExampleShapeHints) {
  for (const [msgName, fieldsByName] of hints) {
    const msg = msgs.get(msgName);
    if (!msg || !Array.isArray(msg.fields)) continue;
    msg.fields = msg.fields.map((f) => {
      const hint = fieldsByName.get(f.name);
      return hint !== undefined && shouldApplyExampleShape(f.type, hint) ? { ...f, type: hint } : f;
    });
  }
}

function hasEnvelope(fields: { name: string }[]): boolean {
  const names = new Set(fields.map((f) => f.name));
  // If a message still has 'type'/'data', it's the envelope form
  return names.has('data') || names.has('type');
}

function preferNewFields(newFields: Message['fields'], oldFields?: Message['fields']): boolean {
  if (!oldFields) return true;

  const oldHasEnv = hasEnvelope(oldFields);
  const newHasEnv = hasEnvelope(newFields);

  // Prefer non-envelope over envelope
  if (oldHasEnv && !newHasEnv) return true;
  if (!oldHasEnv && newHasEnv) return false;

  // Otherwise prefer more (or equal) fields so richer shapes win
  return (newFields?.length ?? 0) >= (oldFields?.length ?? 0);
}

// Put this near your zod helpers
const unwrapZod = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  let s = schema as unknown as Record<string, unknown>;
  // Unwrap common wrappers: Optional, Nullable, Default, Effects
  // Keep unwrapping until we hit a non-wrapper
  while (hasZodDef(s)) {
    const def = s._def as Record<string, unknown>;
    const typeName = def.typeName;

    if (
      typeName === 'ZodOptional' ||
      typeName === 'ZodNullable' ||
      typeName === 'ZodDefault' ||
      typeName === 'ZodEffects'
    ) {
      if (def.innerType !== undefined) {
        s = def.innerType as Record<string, unknown>;
      } else if (def.schema !== undefined) {
        s = def.schema as Record<string, unknown>;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return s as z.ZodTypeAny;
};

function hasZodDef(obj: unknown): obj is { _def: unknown } {
  return typeof obj === 'object' && obj !== null && '_def' in obj;
}

// eslint-disable-next-line complexity
const extractZodType = (schema: z.ZodTypeAny): string => {
  const base = unwrapZod(schema);
  if (!hasZodDef(base)) return 'unknown';
  const def = base._def as Record<string, unknown>;
  const typeName = def.typeName as string | undefined;

  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodDate':
      return 'Date';
    case 'ZodLiteral': {
      if (!hasZodDef(base)) return 'unknown';
      const def = base._def as Record<string, unknown>;
      const val = def.value;
      return typeof val === 'string' ? JSON.stringify(val) : JSON.stringify(val);
    }
    case 'ZodArray': {
      const elementType = extractZodType((base as z.ZodArray<z.ZodTypeAny>)._def.type);
      return `Array<${elementType}>`;
    }
    case 'ZodObject': {
      const shape = (base as z.ZodObject<z.ZodRawShape>)._def.shape();
      const entries = Object.entries(shape)
        .map(([key, val]) => `${key}: ${extractZodType(val)}`)
        .join(', ');
      return `{${entries}}`;
    }
    case 'ZodNullable': {
      const inner = extractZodType((base as z.ZodNullable<z.ZodTypeAny>)._def.innerType);
      return `${inner} | null`;
    }
    default:
      return 'unknown';
  }
};

const zodSchemaToFields = (schema: z.ZodTypeAny): Message['fields'] => {
  const base = unwrapZod(schema);
  if (!hasZodDef(base)) return [];
  const def = base._def as Record<string, unknown>;
  if (def.typeName !== 'ZodObject') return [];

  const shape = (base as z.ZodObject<z.ZodRawShape>)._def.shape();

  return Object.entries(shape).map(([name, field]) => {
    const unwrapped = unwrapZod(field);
    // treat Optional/Nullable/Default as not required
    const fieldWithDef = field;
    const raw = hasZodDef(fieldWithDef) ? (fieldWithDef._def as Record<string, unknown>).typeName : undefined;
    const required = raw !== 'ZodOptional' && raw !== 'ZodNullable' && raw !== 'ZodDefault';

    return {
      name,
      type: extractZodType(unwrapped),
      required,
    };
  });
};

// eslint-disable-next-line complexity
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
        let fields = zodSchemaToFields(schemaItem);

        // Flatten state envelope { type, data: { ... } } for integration-derived states
        if (messageType === 'state') {
          const dataIdx = fields.findIndex(
            (f) => f.name === 'data' && typeof f.type === 'string' && f.type.trim().startsWith('{'),
          );
          if (dataIdx !== -1) {
            const src = fields[dataIdx].type; // "{ a: T, b?: U }" or "{ a: T; b?: U }"
            const bodyMatch = src.match(/^\{\s*([^}]*)\s*\}$/);
            if (bodyMatch && bodyMatch[1]) {
              const body = bodyMatch[1];
              const inner: { name: string; type: string; required: boolean }[] = [];
              // support comma or semicolon separators
              const re = /(\w+)(\?)?\s*:\s*([^;,]+)(?=[;,]|$)/g;
              let m: RegExpExecArray | null;
              while ((m = re.exec(body)) !== null) {
                inner.push({ name: m[1], required: !m[2], type: m[3].trim() });
              }
              // drop 'type' and 'data' fields, replace with flattened inner
              fields = fields
                .filter((f) => f.name !== 'type' && f.name !== 'data')
                .concat(inner.map((f) => ({ ...f, required: f.required })));
            }
          }
        }

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

// eslint-disable-next-line complexity
const createMessage = (
  name: string,
  typeInfo: TypeInfo | undefined,
  messageType: 'command' | 'event' | 'state',
): Message => {
  // Build fields from TypeInfo.dataFields, using actual TypeScript types
  let fields = (typeInfo?.dataFields ?? []).map((f) => ({
    name: f.name,
    type: f.type,
    required: f.required,
    description: undefined,
    defaultValue: undefined,
  }));

  // If this is a State with an envelope { type: ..., data: { ... } }, flatten it.
  if (messageType === 'state') {
    const dataField = fields.find((f) => f.name === 'data' && typeof f.type === 'string' && f.type.startsWith('{'));
    if (dataField) {
      // Parse "{ a: T; b?: U }" into fields a, b with types T, U.
      const inner: { name: string; type: string; required: boolean }[] = [];
      const src = dataField.type;
      const m = src.match(/^\{\s*([^}]*)\s*\}$/);
      if (m && m[1]) {
        const body = m[1];
        const re = /(\w+)(\?)?\s*:\s*([^;]+)(?=;|$)/g;
        let match: RegExpExecArray | null;
        while ((match = re.exec(body)) !== null) {
          inner.push({
            name: match[1],
            required: !match[2],
            type: match[3].trim(),
          });
        }
      }
      // Replace envelope with flattened inner fields, drop 'type' and 'data'
      fields = fields
        .filter((f) => f.name !== 'type' && f.name !== 'data')
        .concat(inner.map((f) => ({ ...f, description: undefined, defaultValue: undefined })));
    } else {
      // If no envelope structure, add the type field with the literal value
      const hasTypeField = fields.some((f) => f.name === 'type');
      if (!hasTypeField && typeInfo?.stringLiteral !== undefined && typeInfo.stringLiteral !== null) {
        fields.unshift({
          name: 'type',
          type: `"${typeInfo.stringLiteral}"`,
          required: true,
          description: undefined,
          defaultValue: undefined,
        });
      }
    }
  }

  const metadata = { version: 1 };

  // Only set source on events
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

function processDestinationMessage(message: unknown, messages: Map<string, Message>): void {
  if (typeof message === 'object' && message !== null && 'name' in message && 'type' in message) {
    const typedMessage = message as { name: unknown; type: unknown };
    if (typeof typedMessage.name === 'string' && typeof typedMessage.type === 'string') {
      const messageType = typedMessage.type as 'command' | 'query' | 'reaction';
      const mappedType = mapKindToMessageType(messageType);
      if (!messages.has(typedMessage.name)) {
        // For integration messages without TypeInfo, create empty field list
        messages.set(typedMessage.name, createMessage(typedMessage.name, undefined, mappedType));
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
        processDestinationMessage(d.destination.message, messages);
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
): void {
  if (hasDestination(d)) {
    processDestination(d, integrations, messages);
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
  const exampleShapeHints: ExampleShapeHints = new Map();

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

    // Helper to resolve type names and get TypeInfo
    const resolveTypeAndInfo = (
      t: string,
      expected?: 'command' | 'event' | 'state',
      exampleData?: unknown,
    ): { resolvedName: string; typeInfo: TypeInfo | undefined } => {
      // First try flow-specific types, then union/global
      let resolvedName = t;
      let typeInfo: TypeInfo | undefined;

      if (flowSpecificTypes) {
        resolvedName = resolveInferredType(t, flowSpecificTypes, expected, exampleData);
        typeInfo = flowSpecificTypes.get(resolvedName);

        // If not resolved and we have union types, try union types as fallback
        if (resolvedName === 'InferredType' && unionTypes) {
          resolvedName = resolveInferredType(t, unionTypes, expected, exampleData);
          typeInfo = unionTypes.get(resolvedName);
        }
      } else if (unionTypes) {
        resolvedName = resolveInferredType(t, unionTypes, expected, exampleData);
        typeInfo = unionTypes.get(resolvedName);
      }

      return { resolvedName, typeInfo };
    };

    flow.slices.forEach((slice) => {
      // Extract messages from server specs (Given/When/Then)
      if ('server' in slice && slice.server?.specs !== undefined) {
        const spec = slice.server.specs;
        spec.rules.forEach((rule) => {
          // eslint-disable-next-line complexity
          rule.examples.forEach((example) => {
            // given
            if (example.given) {
              // eslint-disable-next-line complexity
              example.given.forEach((g) => {
                if ('eventRef' in g) {
                  const { resolvedName, typeInfo } = resolveTypeAndInfo(g.eventRef, 'event', g.exampleData);

                  // Fix ref type if resolved type has different classification
                  if (typeInfo && typeInfo.classification !== 'event') {
                    if (typeInfo.classification === 'state') {
                      delete (g as Record<string, unknown>).eventRef;
                      (g as Record<string, unknown>).stateRef = resolvedName;
                      if (g.exampleData !== undefined) {
                        collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
                      }
                    } else if (typeInfo.classification === 'command') {
                      delete (g as Record<string, unknown>).eventRef;
                      (g as Record<string, unknown>).commandRef = resolvedName;
                      if (g.exampleData !== undefined) {
                        collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
                      }
                    }
                  } else {
                    g.eventRef = resolvedName;
                    if (g.exampleData !== undefined) {
                      collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
                    }
                  }

                  const messageType = typeInfo?.classification || 'event';
                  const msg = createMessage(resolvedName, typeInfo, messageType);
                  const existing = messages.get(resolvedName);
                  if (!existing || preferNewFields(msg.fields, existing.fields)) {
                    messages.set(resolvedName, msg);
                  }
                }

                if ('stateRef' in g) {
                  const { resolvedName, typeInfo } = resolveTypeAndInfo(g.stateRef, 'state', g.exampleData);
                  g.stateRef = resolvedName;

                  // collect example shapes for given state
                  if (g.exampleData !== undefined) {
                    collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
                  }

                  const msg = createMessage(resolvedName, typeInfo, 'state');
                  const existing = messages.get(resolvedName);
                  if (!existing || preferNewFields(msg.fields, existing.fields)) {
                    messages.set(resolvedName, msg);
                  }
                }

                if ('commandRef' in g) {
                  const cmdRef = (g as { commandRef?: unknown }).commandRef;
                  if (typeof cmdRef === 'string') {
                    const { resolvedName, typeInfo } = resolveTypeAndInfo(cmdRef, 'command', g.exampleData);
                    g.commandRef = resolvedName;

                    // collect example shapes for given command
                    if (g.exampleData !== undefined) {
                      collectExampleHintsForData(resolvedName, g.exampleData, exampleShapeHints);
                    }

                    const msg = createMessage(resolvedName, typeInfo, 'command');
                    const existing = messages.get(resolvedName);
                    if (!existing || preferNewFields(msg.fields, existing.fields)) {
                      messages.set(resolvedName, msg);
                    }
                  }
                }
              });
            }

            // when
            // when (single)
            if ('commandRef' in example.when) {
              const expected = slice.type === 'command' ? 'command' : 'event';
              const { resolvedName, typeInfo } = resolveTypeAndInfo(
                example.when.commandRef,
                expected,
                example.when.exampleData,
              );

              // Fix ref type if resolved type has different classification
              if (typeInfo && typeInfo.classification !== 'command') {
                if (typeInfo.classification === 'event') {
                  delete (example.when as Record<string, unknown>).commandRef;
                  (example.when as Record<string, unknown>).eventRef = resolvedName;
                } else if (typeInfo.classification === 'state') {
                  delete (example.when as Record<string, unknown>).commandRef;
                  (example.when as Record<string, unknown>).stateRef = resolvedName;
                }
              } else {
                example.when.commandRef = resolvedName;
              }

              // collect example shapes for when (single)
              if (example.when.exampleData !== undefined) {
                const w = example.when as Record<string, unknown>;
                const refName = (w.commandRef as string) || (w.eventRef as string) || (w.stateRef as string);
                if (typeof refName === 'string') {
                  collectExampleHintsForData(refName, example.when.exampleData, exampleShapeHints);
                }
              }

              const messageType = typeInfo?.classification || (slice.type === 'command' ? 'command' : 'event');
              const msg = createMessage(resolvedName, typeInfo, messageType);
              const existing = messages.get(resolvedName);
              if (!existing || preferNewFields(msg.fields, existing.fields)) {
                messages.set(resolvedName, msg);
              }
            } else if (Array.isArray(example.when)) {
              // when (array)
              example.when.forEach((ev) => {
                const { resolvedName, typeInfo } = resolveTypeAndInfo(ev.eventRef, 'event', ev.exampleData);
                ev.eventRef = resolvedName;

                // collect example shapes for when (array)
                if (ev.exampleData !== undefined) {
                  collectExampleHintsForData(resolvedName, ev.exampleData, exampleShapeHints);
                }

                const messageType = typeInfo?.classification || 'event';
                const msg = createMessage(resolvedName, typeInfo, messageType);
                const existing = messages.get(resolvedName);
                if (!existing || preferNewFields(msg.fields, existing.fields)) {
                  messages.set(resolvedName, msg);
                }
              });
            }

            // then
            if (Array.isArray(example.then) && example.then.length > 0) {
              // eslint-disable-next-line complexity
              example.then.forEach((t) => {
                if ('eventRef' in t) {
                  const { resolvedName, typeInfo } = resolveTypeAndInfo(t.eventRef, 'event', t.exampleData);
                  t.eventRef = resolvedName;

                  // collect example shapes for then event
                  if (t.exampleData !== undefined) {
                    collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
                  }

                  const messageType =
                    typeInfo?.classification === 'command' ||
                    typeInfo?.classification === 'event' ||
                    typeInfo?.classification === 'state'
                      ? typeInfo.classification
                      : 'event';
                  const msg = createMessage(resolvedName, typeInfo, messageType);
                  const existing = messages.get(resolvedName);
                  if (!existing || preferNewFields(msg.fields, existing.fields)) {
                    messages.set(resolvedName, msg);
                  }
                } else if ('commandRef' in t) {
                  const { resolvedName, typeInfo } = resolveTypeAndInfo(t.commandRef, 'command', t.exampleData);

                  // Fix ref type if resolved type has different classification
                  if (typeInfo && typeInfo.classification !== 'command') {
                    if (typeInfo.classification === 'event') {
                      delete (t as Record<string, unknown>).commandRef;
                      (t as Record<string, unknown>).eventRef = resolvedName;
                      if (t.exampleData !== undefined)
                        collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
                    } else if (typeInfo.classification === 'state') {
                      delete (t as Record<string, unknown>).commandRef;
                      (t as Record<string, unknown>).stateRef = resolvedName;
                      if (t.exampleData !== undefined)
                        collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
                    }
                  } else {
                    t.commandRef = resolvedName;
                    if (t.exampleData !== undefined)
                      collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
                  }

                  const messageType = typeInfo?.classification || 'command';
                  const msg = createMessage(resolvedName, typeInfo, messageType);
                  const existing = messages.get(resolvedName);
                  if (!existing || preferNewFields(msg.fields, existing.fields)) {
                    messages.set(resolvedName, msg);
                  }
                } else if ('stateRef' in t) {
                  const { resolvedName, typeInfo } = resolveTypeAndInfo(t.stateRef, 'state', t.exampleData);
                  t.stateRef = resolvedName;

                  // collect example shapes for then state
                  if (t.exampleData !== undefined) {
                    collectExampleHintsForData(resolvedName, t.exampleData, exampleShapeHints);
                  }

                  const messageType = typeInfo?.classification || 'state';
                  const msg = createMessage(resolvedName, typeInfo, messageType);
                  const existing = messages.get(resolvedName);
                  if (!existing || preferNewFields(msg.fields, existing.fields)) {
                    messages.set(resolvedName, msg);
                  }
                }
              });
            }
          });
        });
      }

      // Integrations: from data & via
      if ('server' in slice && slice.server?.data !== undefined) {
        slice.server.data.forEach((d) => {
          processDataItemIntegrations(d, integrations, messages);
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

  // 1) Apply example-driven structural shapes (e.g., Array<Product> -> Array<{ ... }>)
  applyExampleShapeHints(messages, exampleShapeHints);

  // 2) Then inline resolvable identifiers via TypeInfo (if available)
  if (unionTypes) {
    inlineAllMessageFieldTypes(messages, unionTypes);
  }

  return {
    variant: 'specs' as const,
    flows,
    messages: Array.from(messages.values()),
    integrations: Array.from(integrations.values()),
  };
};
