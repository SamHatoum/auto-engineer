import { TypeInfo } from '../../loader/ts-utils';
import { Message } from '../../index';

function mapKindToMessageType(k: 'command' | 'query' | 'reaction'): 'command' | 'event' | 'state' {
  if (k === 'command') return 'command';
  if (k === 'query') return 'state';
  return 'event';
}

function buildInitialFields(typeInfo: TypeInfo | undefined) {
  return (typeInfo?.dataFields ?? []).map((f) => ({
    name: f.name,
    type: f.type,
    required: f.required,
    description: undefined,
    defaultValue: undefined,
  }));
}

function parseEnvelopeFields(src: string) {
  const inner: { name: string; type: string; required: boolean }[] = [];
  const m = src.match(/^\{\s*([^}]*)\s*\}$/);
  if (m && m[1]) {
    const body = m[1];
    const re = /(\w+)(\?)?\s*:\s*([^;,]+)(?=[;,]|$)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(body)) !== null) {
      inner.push({
        name: match[1],
        required: !match[2],
        type: match[3].trim(),
      });
    }
  }
  return inner;
}

function processStateFields(
  fields: Array<{ name: string; type: string; required: boolean; description: undefined; defaultValue: undefined }>,
) {
  const dataField = fields.find((f) => f.name === 'data' && true && f.type.trim().startsWith('{'));
  if (dataField) {
    const inner = parseEnvelopeFields(dataField.type);
    // Replace envelope with flattened inner fields, drop 'type' and 'data'
    return fields
      .filter((f) => f.name !== 'type' && f.name !== 'data')
      .concat(inner.map((f) => ({ ...f, description: undefined, defaultValue: undefined })));
  }
  return fields;
}

export function createMessage(
  name: string,
  typeInfo: TypeInfo | undefined,
  messageType: 'command' | 'event' | 'state',
): Message {
  let fields = buildInitialFields(typeInfo);

  if (messageType === 'state') {
    fields = processStateFields(fields);
  }

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
}

export function processDestinationMessage(message: unknown, messages: Map<string, Message>): void {
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
