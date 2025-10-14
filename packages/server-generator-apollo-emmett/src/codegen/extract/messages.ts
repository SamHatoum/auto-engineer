import { extractCommandsFromGwt, extractCommandsFromThen } from './commands';
import { CommandExample, ErrorExample, EventExample, Slice, StateExample } from '@auto-engineer/narrative';
import { Message, MessageDefinition } from '../types';
import { extractEventsFromGiven, extractEventsFromThen, extractEventsFromWhen } from './events';
import { extractFieldsFromMessage } from './fields';
import { extractProjectionIdField } from './projection';
import { extractStatesFromData, extractStatesFromTarget } from './states';
import createDebug from 'debug';

const debug = createDebug('auto:server-generator-apollo-emmett:extract:messages');
const debugCommand = createDebug('auto:server-generator-apollo-emmett:extract:messages:command');
const debugQuery = createDebug('auto:server-generator-apollo-emmett:extract:messages:query');
const debugReact = createDebug('auto:server-generator-apollo-emmett:extract:messages:react');
const debugDedupe = createDebug('auto:server-generator-apollo-emmett:extract:messages:dedupe');

export interface ExtractedMessages {
  commands: Message[];
  events: Message[];
  states: Message[];
  commandSchemasByName: Record<string, Message>;
  projectionIdField?: string;
}

export interface ReactGwtSpec {
  when: EventExample[];
  then: CommandExample[];
}

export interface CommandGwtSpec {
  given?: EventExample[];
  when: CommandExample;
  then: Array<EventExample | ErrorExample>;
}

export interface QueryGwtSpec {
  given: EventExample[];
  then: StateExample[];
}

const EMPTY_EXTRACTED_MESSAGES: ExtractedMessages = {
  commands: [],
  events: [],
  states: [],
  commandSchemasByName: {},
};

function deduplicateMessages<T extends Message>(messages: T[]): T[] {
  debugDedupe('Deduplicating %d messages', messages.length);
  const uniqueMap = new Map<string, T>();
  for (const message of messages) {
    if (!uniqueMap.has(message.type)) {
      uniqueMap.set(message.type, message);
      debugDedupe('  Added unique message: %s', message.type);
    } else {
      debugDedupe('  Skipped duplicate message: %s', message.type);
    }
  }
  const result = Array.from(uniqueMap.values());
  debugDedupe('Result: %d unique messages from %d total', result.length, messages.length);
  return result;
}

function extractMessagesForCommand(slice: Slice, allMessages: MessageDefinition[]): ExtractedMessages {
  debugCommand('Extracting messages for command slice: %s', slice.name);

  if (slice.type !== 'command') {
    debugCommand('  Slice type is not command, returning empty');
    return EMPTY_EXTRACTED_MESSAGES;
  }

  const specs = slice.server?.specs;
  const rules = specs?.rules;
  const gwtSpecs =
    Array.isArray(rules) && rules.length > 0
      ? rules.flatMap((rule) =>
          rule.examples.map((example) => ({
            given: example.given,
            when: example.when,
            then: example.then,
          })),
        )
      : [];
  debugCommand('  Found %d GWT specs', gwtSpecs.length);

  const { commands, commandSchemasByName } = extractCommandsFromGwt(gwtSpecs, allMessages);
  debugCommand('  Extracted %d commands', commands.length);
  debugCommand('  Command schemas: %o', Object.keys(commandSchemasByName));

  const events: Message[] = gwtSpecs.flatMap((gwt): Message[] => {
    const givenEventsOnly = gwt.given?.filter((item): item is EventExample => 'eventRef' in item);
    const givenEvents = extractEventsFromGiven(givenEventsOnly, allMessages, slice.name);

    const thenEventsOnly = gwt.then.filter((item): item is EventExample => 'eventRef' in item);
    const thenEvents = extractEventsFromThen(thenEventsOnly, allMessages, slice.name);
    debugCommand('    GWT: given=%d events, then=%d events', givenEvents.length, thenEvents.length);
    return [...givenEvents, ...thenEvents];
  });
  debugCommand('  Total events extracted: %d', events.length);

  const result = {
    commands,
    events: deduplicateMessages(events),
    states: [],
    commandSchemasByName,
  };

  debugCommand('  Final result: %d commands, %d events', result.commands.length, result.events.length);
  return result;
}

function extractMessagesForQuery(slice: Slice, allMessages: MessageDefinition[]): ExtractedMessages {
  debugQuery('Extracting messages for query slice: %s', slice.name);

  if (slice.type !== 'query') {
    debugQuery('  Slice type is not query, returning empty');
    return EMPTY_EXTRACTED_MESSAGES;
  }

  const specs = slice.server?.specs;
  const rules = specs?.rules;
  const gwtSpecs =
    Array.isArray(rules) && rules.length > 0
      ? rules.flatMap((rule) =>
          rule.examples.map((example) => ({
            given: example.given,
            when: example.when,
            then: example.then,
          })),
        )
      : [];
  debugQuery('  Found %d GWT specs', gwtSpecs.length);

  const projectionIdField = extractProjectionIdField(slice);
  debugQuery('  Projection ID field: %s', projectionIdField ?? 'none');

  const events: Message[] = gwtSpecs.flatMap((gwt) => {
    const eventsFromGiven = Array.isArray(gwt.given)
      ? gwt.given.filter((item): item is EventExample => 'eventRef' in item)
      : [];
    let eventsFromWhen: EventExample[] = [];
    if (Array.isArray(gwt.when)) {
      eventsFromWhen = gwt.when.filter((item): item is EventExample => 'eventRef' in item);
    } else if (gwt.when != null && typeof gwt.when === 'object' && 'eventRef' in gwt.when) {
      // when is a single object, convert to array
      const whenItem = gwt.when as EventExample;
      if (whenItem.eventRef && whenItem.eventRef.trim() !== '') {
        eventsFromWhen = [whenItem];
      }
    }
    const givenEvents = extractEventsFromGiven(eventsFromGiven, allMessages);
    const whenEvents = eventsFromWhen
      .map((eventExample) => {
        const fields = extractFieldsFromMessage(eventExample.eventRef, 'event', allMessages);
        const messageDef = allMessages.find((m) => m.type === 'event' && m.name === eventExample.eventRef);
        const metadata = messageDef?.metadata as { sourceFlowName?: string; sourceSliceName?: string } | undefined;

        return {
          type: eventExample.eventRef,
          fields,
          source: 'when' as const, // Mark as 'when' source for query events
          sourceFlowName: metadata?.sourceFlowName,
          sourceSliceName: metadata?.sourceSliceName,
        } as Message;
      })
      .filter((event): event is Message => event.type !== undefined);

    return [...givenEvents, ...whenEvents];
  });
  debugQuery('  Extracted %d events total', events.length);

  const states: Message[] = extractStatesFromTarget(slice, allMessages);
  debugQuery('  Extracted %d states from target', states.length);

  const result = {
    commands: [],
    events: deduplicateMessages(events),
    states,
    commandSchemasByName: {},
    projectionIdField,
  };

  debugQuery('  Final result: %d events, %d states', result.events.length, result.states.length);
  return result;
}

function extractMessagesForReact(slice: Slice, allMessages: MessageDefinition[]): ExtractedMessages {
  debugReact('Extracting messages for react slice: %s', slice.name);

  if (slice.type !== 'react') {
    debugReact('  Slice type is not react, returning empty');
    return EMPTY_EXTRACTED_MESSAGES;
  }

  const specs = slice.server?.specs;
  const rules = specs?.rules;
  const gwtSpecs =
    Array.isArray(rules) && rules.length > 0
      ? rules.flatMap((rule) =>
          rule.examples.map((example) => ({
            given: example.given,
            when: example.when,
            then: example.then,
          })),
        )
      : [];
  debugReact('  Found %d GWT specs', gwtSpecs.length);

  const events = extractEventsFromWhen(gwtSpecs as ReactGwtSpec[], allMessages);
  debugReact('  Extracted %d events from when', events.length);

  const { commands, commandSchemasByName } = extractCommandsFromThen(gwtSpecs, allMessages);
  debugReact('  Extracted %d commands from then', commands.length);
  debugReact('  Command schemas: %o', Object.keys(commandSchemasByName));

  const states = extractStatesFromData(slice, allMessages);
  debugReact('  Extracted %d states from data', states.length);

  const result = {
    commands,
    events: deduplicateMessages(events),
    states,
    commandSchemasByName,
  };

  debugReact(
    '  Final result: %d commands, %d events, %d states',
    result.commands.length,
    result.events.length,
    result.states.length,
  );
  return result;
}

export function extractMessagesFromSpecs(slice: Slice, allMessages: MessageDefinition[]): ExtractedMessages {
  debug('Extracting messages from slice: %s (type: %s)', slice.name, slice.type);
  debug('  Total message definitions available: %d', allMessages.length);

  let result: ExtractedMessages;

  switch (slice.type) {
    case 'command':
      result = extractMessagesForCommand(slice, allMessages);
      break;
    case 'query':
      result = extractMessagesForQuery(slice, allMessages);
      break;
    case 'react':
      result = extractMessagesForReact(slice, allMessages);
      break;
    default: {
      const unknownSlice = slice as Slice;
      debug('  Unknown slice type: %s, returning empty', unknownSlice.type);
      result = EMPTY_EXTRACTED_MESSAGES;
    }
  }

  debug(
    '  Extraction complete: %d commands, %d events, %d states',
    result.commands.length,
    result.events.length,
    result.states.length,
  );

  return result;
}
