import {extractCommandsFromGwt, extractCommandsFromThen} from "./commands";
import {CommandExample, ErrorExample, EventExample, Slice, StateExample} from "@auto-engineer/flowlang";
import {Message, MessageDefinition} from "../types";
import {extractEventsFromGiven, extractEventsFromThen, extractEventsFromWhen} from "./events";
import {extractProjectionIdField} from "./projection";
import {extractStatesFromData, extractStatesFromTarget} from "./states";

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

export interface CommandGwtSpec  {
    given?: EventExample[];
    when: CommandExample;
    then: Array<EventExample | ErrorExample>;
};


export interface QueryGwtSpec  {
    given: EventExample[];
    then: StateExample[];
};

const EMPTY_EXTRACTED_MESSAGES: ExtractedMessages = {
    commands: [],
    events: [],
    states: [],
    commandSchemasByName: {}
};

function deduplicateMessages<T extends Message>(messages: T[]): T[] {
    const uniqueMap = new Map<string, T>();
    for (const message of messages) {
        if (!uniqueMap.has(message.type)) {
            uniqueMap.set(message.type, message);
        }
    }
    return Array.from(uniqueMap.values());
}

function extractMessagesForCommand(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    if (slice.type !== 'command') {
        return EMPTY_EXTRACTED_MESSAGES;
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    const { commands, commandSchemasByName } = extractCommandsFromGwt(gwtSpecs, allMessages);

    const events: Message[] = gwtSpecs.flatMap((gwt): Message[] => {
        const givenEvents = extractEventsFromGiven(gwt.given, allMessages);
        const thenEvents = extractEventsFromThen(gwt.then, allMessages);
        return [...givenEvents, ...thenEvents];
    });

    return {
        commands,
        events: deduplicateMessages(events),
        states: [],
        commandSchemasByName,
    };
}

function extractMessagesForQuery(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    if (slice.type !== 'query') {
        return EMPTY_EXTRACTED_MESSAGES;
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    const projectionIdField = extractProjectionIdField(slice);

    const events: Message[] = gwtSpecs.flatMap((gwt) =>
        extractEventsFromGiven(gwt.given, allMessages)
    );

    const states: Message[] = extractStatesFromTarget(slice, allMessages);

    return {
        commands: [],
        events: deduplicateMessages(events),
        states,
        commandSchemasByName: {},
        projectionIdField,
    };
}

function extractMessagesForReact(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    if (slice.type !== 'react') {
        return EMPTY_EXTRACTED_MESSAGES;
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    const events = extractEventsFromWhen(gwtSpecs, allMessages);
    const { commands, commandSchemasByName } = extractCommandsFromThen(gwtSpecs, allMessages);
    const states = extractStatesFromData(slice, allMessages);

    return {
        commands,
        events: deduplicateMessages(events),
        states,
        commandSchemasByName,
    };
}

export function extractMessagesFromSpecs(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    switch (slice.type) {
        case 'command':
            return extractMessagesForCommand(slice, allMessages);
        case 'query':
            return extractMessagesForQuery(slice, allMessages);
        case 'react':
            return extractMessagesForReact(slice, allMessages);
        default:
            return EMPTY_EXTRACTED_MESSAGES;
    }
}