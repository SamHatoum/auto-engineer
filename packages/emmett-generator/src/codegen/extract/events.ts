import {EventExample} from "@auto-engineer/flowlang";
import {Message, MessageDefinition} from "../types";
import {extractFieldsFromMessage} from "./fields";

export function extractEventsFromThen(
    thenItems: Array<EventExample | { errorType: string; message?: string }>,
    allMessages: MessageDefinition[]
): Message[] {
    return thenItems
        .map((then): Message | undefined => {
            if (!('eventRef' in then) || !then.eventRef) return undefined;

            const fields = extractFieldsFromMessage(then.eventRef, 'event', allMessages);
            return { type: then.eventRef, fields, source: 'then' };
        })
        .filter((event): event is Message => event !== undefined);
}

export function extractEventsFromGiven(
    givenEvents: EventExample[] | undefined,
    allMessages: MessageDefinition[]
): Message[] {
    if (!givenEvents) return [];

    return givenEvents
        .map((given): Message | undefined => {
            if (!given.eventRef) return undefined;

            const fields = extractFieldsFromMessage(given.eventRef, 'event', allMessages);
            return { type: given.eventRef, fields, source: 'given' };
        })
        .filter((event): event is Message => event !== undefined);
}