import {Slice} from "@auto-engineer/flowlang";
import {Message, MessageDefinition} from "../types";
import {extractFieldsFromMessage} from "./fields";

export function extractStatesFromTarget(slice: Slice, allMessages: MessageDefinition[]): Message[] {
    const targets = slice.server?.data?.map(d => d.target?.name).filter(Boolean) as string[];
    const uniqueTargets = Array.from(new Set(targets));

    return uniqueTargets.map((name) => ({
        type: name,
        fields: extractFieldsFromMessage(name, 'state', allMessages),
    }));
}