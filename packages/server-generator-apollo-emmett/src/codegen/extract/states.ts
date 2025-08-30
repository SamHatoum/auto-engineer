import { Slice } from '@auto-engineer/flow';
import { Message, MessageDefinition } from '../types';
import { extractFieldsFromMessage } from './fields';

function createStateMessage(stateName: string, allMessages: MessageDefinition[]): Message {
  return {
    type: stateName,
    fields: extractFieldsFromMessage(stateName, 'state', allMessages),
  };
}

export function extractStatesFromTarget(slice: Slice, allMessages: MessageDefinition[]): Message[] {
  const targets = slice.server?.data?.map((d) => d.target?.name).filter(Boolean) as string[];
  const uniqueTargets = Array.from(new Set(targets));

  return uniqueTargets.map((name) => createStateMessage(name, allMessages));
}

export function extractStatesFromData(slice: Slice, allMessages: MessageDefinition[]): Message[] {
  if (!slice.server?.data) {
    return [];
  }

  const states: Message[] = [];
  const seenStates = new Set<string>();

  for (const dataItem of slice.server.data) {
    if (!('origin' in dataItem) || !dataItem.target?.name) {
      continue;
    }

    const stateName = dataItem.target.name;
    if (seenStates.has(stateName)) {
      continue;
    }

    const fields = extractFieldsFromMessage(stateName, 'state', allMessages);
    if (fields.length > 0) {
      states.push(createStateMessage(stateName, allMessages));
      seenStates.add(stateName);
    }
  }

  return states;
}
