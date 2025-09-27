import { EventExample } from '@auto-engineer/flow';
import { Message, MessageDefinition } from '../types';
import { extractFieldsFromMessage } from './fields';
import { ReactGwtSpec } from './messages';

function createEventMessage(
  eventRef: string | undefined,
  source: 'given' | 'then' | 'when',
  allMessages: MessageDefinition[],
  currentSliceName?: string,
  currentFlowName?: string,
): Message | undefined {
  if (eventRef == null) return undefined;
  const fields = extractFieldsFromMessage(eventRef, 'event', allMessages);
  const messageDef = allMessages.find((m) => m.type === 'event' && m.name === eventRef);
  const metadata = messageDef?.metadata as { sourceFlowName?: string; sourceSliceName?: string } | undefined;
  const sourceFlowName = metadata?.sourceFlowName ?? currentFlowName;
  const sourceSliceName = metadata?.sourceSliceName ?? currentSliceName;

  return {
    type: eventRef,
    fields,
    source,
    sourceFlowName,
    sourceSliceName,
  };
}

export function extractEventsFromThen(
  thenItems: Array<EventExample | { errorType: string; message?: string }>,
  allMessages: MessageDefinition[],
  currentSliceName?: string,
  currentFlowName?: string,
): Message[] {
  return thenItems
    .map((then): Message | undefined => {
      if (!('eventRef' in then)) return undefined;
      return createEventMessage(then.eventRef, 'then', allMessages, currentSliceName, currentFlowName);
    })
    .filter((event): event is Message => event !== undefined);
}

export function extractEventsFromGiven(
  givenEvents: EventExample[] | undefined,
  allMessages: MessageDefinition[],
  currentSliceName?: string,
  currentFlowName?: string,
): Message[] {
  if (!givenEvents) return [];

  return givenEvents
    .map((given) => createEventMessage(given.eventRef, 'given', allMessages, currentSliceName, currentFlowName))
    .filter((event): event is Message => event !== undefined);
}

export function extractEventsFromWhen(gwtSpecs: ReactGwtSpec[], allMessages: MessageDefinition[]): Message[] {
  return gwtSpecs.flatMap((gwt) => {
    if (!Array.isArray(gwt.when)) {
      return [];
    }
    return gwt.when.flatMap((eventExample) => extractEventsFromGiven([eventExample], allMessages));
  });
}
