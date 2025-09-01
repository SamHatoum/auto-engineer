import { Field, MessageDefinition } from '../types';

export function extractFieldsFromMessage(
  messageName: string,
  messageType: 'command' | 'event' | 'state',
  allMessages: MessageDefinition[],
): Field[] {
  const messageDef = allMessages.find((m) => m.type === messageType && m.name === messageName);

  return (
    messageDef?.fields?.map((f) => ({
      name: f.name,
      tsType: f.type,
      required: f.required ?? true,
    })) ?? []
  );
}
