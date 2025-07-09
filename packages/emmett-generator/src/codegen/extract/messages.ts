import {extractCommandsFromGwt} from "./commands";
import {Slice} from "@auto-engineer/flowlang";
import {Message, MessageDefinition} from "../types";
import {extractEventsFromGiven, extractEventsFromThen} from "./events";
import {extractProjectionIdField} from "./projection";
import {extractStatesFromTarget} from "./states";

export interface ExtractedMessages {
    commands: Message[];
    events: Message[];
    states: Message[];
    commandSchemasByName: Record<string, Message>;
    projectionIdField?: string;
}

export function extractMessagesForCommand(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    if (slice.type !== 'command') {
        return { commands: [], events: [], states: [], commandSchemasByName: {} };
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    const { commands, commandSchemasByName } = extractCommandsFromGwt(gwtSpecs, allMessages);

    const events: Message[] = gwtSpecs.flatMap((gwt): Message[] => {
        const givenEvents = extractEventsFromGiven(gwt.given, allMessages);
        const thenEvents = extractEventsFromThen(gwt.then, allMessages);
        return [...givenEvents, ...thenEvents];
    });

    const uniqueEventsMap = new Map<string, Message>();
    for (const event of events) {
        if (!uniqueEventsMap.has(event.type)) {
            uniqueEventsMap.set(event.type, event);
        }
    }

    return {
        commands,
        events: Array.from(uniqueEventsMap.values()),
        states: [],
        commandSchemasByName,
    };
}

export function extractMessagesForQuery(
    slice: Slice,
    allMessages: MessageDefinition[]
): ExtractedMessages {
    if (slice.type !== 'query') {
        return { commands: [], events: [], states: [], commandSchemasByName: {} };
    }

    const gwtSpecs = slice.server?.gwt ?? [];
    const projectionIdField = extractProjectionIdField(slice);

    const events: Message[] = gwtSpecs.flatMap((gwt) =>
        extractEventsFromGiven(gwt.given, allMessages)
    );

    const states: Message[] = extractStatesFromTarget(slice, allMessages);

    const uniqueEventsMap = new Map<string, Message>();
    for (const event of events) {
        if (!uniqueEventsMap.has(event.type)) {
            uniqueEventsMap.set(event.type, event);
        }
    }

    return {
        commands: [],
        events: Array.from(uniqueEventsMap.values()),
        states,
        commandSchemasByName: {},
        projectionIdField,
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
            // TODO: Implement react slice message extraction
            return { commands: [], events: [], states: [], commandSchemasByName: {} };
        default:
            return { commands: [], events: [], states: [], commandSchemasByName: {} };
    }
}