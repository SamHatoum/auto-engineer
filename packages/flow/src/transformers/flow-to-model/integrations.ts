import { Integration } from '../../types';
import { Message } from '../../index';
import { zodSchemaToFields } from './zod-adapter';
import { debugIntegrations } from './debug';
import { hasDestination, hasOrigin, hasWithState, isValidIntegration } from './guards';
import { processDestinationMessage } from './messages';

export function addIntegrationToMap(
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

export function processDestination(
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

export function processOrigin(
  d: { origin: unknown },
  integrations: Map<string, { name: string; description?: string; source: string }>,
): void {
  if (isValidIntegration(d.origin)) {
    d.origin.systems.forEach((system: string) => {
      addIntegrationToMap(integrations, system);
    });
  }
}

export function processWithStateOrigin(
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

export function processDataItemIntegrations(
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

function flattenStateEnvelope(fields: Message['fields']): Message['fields'] {
  const dataIdx = fields.findIndex(
    (f) => f.name === 'data' && typeof f.type === 'string' && f.type.trim().startsWith('{'),
  );

  if (dataIdx !== -1) {
    const src = fields[dataIdx].type; // "{ a: T, b?: U }" or "{ a: T; b?: U }"
    const bodyMatch = src.match(/^\{\s*([^}]*)\s*\}$/);
    if (bodyMatch && bodyMatch[1]) {
      const body = bodyMatch[1];
      const inner: { name: string; type: string; required: boolean }[] = [];
      // support comma OR semicolon separators
      const re = /(\w+)(\?)?\s*:\s*([^;,]+)(?=[;,]|$)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        inner.push({ name: m[1], required: !m[2], type: m[3].trim() });
      }
      return fields
        .filter((f) => f.name !== 'type' && f.name !== 'data')
        .concat(inner.map((f) => ({ ...f, required: f.required })));
    }
  }

  // No envelope? still drop the discriminator 'type'
  return fields.filter((f) => f.name !== 'type');
}

function createMessageFromFields(
  name: string,
  fields: Message['fields'],
  messageType: 'command' | 'state' | 'event',
): Message {
  if (messageType === 'event') {
    return {
      type: 'event',
      name,
      fields,
      source: 'external',
      metadata: { version: 1 },
    };
  } else if (messageType === 'command') {
    return {
      type: 'command',
      name,
      fields,
      metadata: { version: 1 },
    };
  } else {
    return {
      type: 'state',
      name,
      fields,
      metadata: { version: 1 },
    };
  }
}

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
          fields = flattenStateEnvelope(fields);
        }

        debugIntegrations(
          `[extractMessagesFromIntegrations] Creating ${messageType} message '${name}' with fields:`,
          fields,
        );

        messages.push(createMessageFromFields(name, fields, messageType));
      }
    }
  } else {
    debugIntegrations(`[extractMessagesFromIntegrations] No ${schemaType}.schema found for ${integration.name}`);
  }

  return messages;
};

export const extractMessagesFromIntegrations = (integrations: Integration[]): Message[] => {
  const messages: Message[] = [];

  for (const integration of integrations) {
    debugIntegrations('Processing integration for message extraction: %s', integration.name);

    messages.push(...extractSchemaType(integration, 'Commands', 'command'));
    messages.push(...extractSchemaType(integration, 'Queries', 'state'));
    messages.push(...extractSchemaType(integration, 'Reactions', 'event'));
  }

  return messages;
};
