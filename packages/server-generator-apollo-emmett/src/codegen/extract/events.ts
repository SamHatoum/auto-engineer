import { EventExample } from '@auto-engineer/flow';
import { Message, MessageDefinition } from '../types';
import { extractFieldsFromMessage } from './fields';
import { ReactGwtSpec } from './messages';

function createEventMessage(
  eventRef: string | undefined,
  source: 'given' | 'then' | 'when',
  allMessages: MessageDefinition[],
): Message | undefined {
  if (eventRef == null) return undefined;
  const fields = extractFieldsFromMessage(eventRef, 'event', allMessages);
  return { type: eventRef, fields, source };
}

export function extractEventsFromThen(
  thenItems: Array<EventExample | { errorType: string; message?: string }>,
  allMessages: MessageDefinition[],
): Message[] {
  return thenItems
    .map((then): Message | undefined => {
      if (!('eventRef' in then)) return undefined;
      return createEventMessage(then.eventRef, 'then', allMessages);
    })
    .filter((event): event is Message => event !== undefined);
}

export function extractEventsFromGiven(
  givenEvents: EventExample[] | undefined,
  allMessages: MessageDefinition[],
): Message[] {
  if (!givenEvents) return [];

  return givenEvents
    .map((given) => createEventMessage(given.eventRef, 'given', allMessages))
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
