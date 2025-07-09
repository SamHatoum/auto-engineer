import {CommandExample, EventExample} from "@auto-engineer/flowlang";
import {Message, MessageDefinition} from "../types";
import {extractFieldsFromMessage} from "./fields";

export function extractCommandsFromGwt(
    gwtSpecs: Array<{
        given?: EventExample[];
        when: CommandExample;
        then: Array<EventExample | { errorType: string; message?: string }>;
    }>,
    allMessages: MessageDefinition[]
): { commands: Message[]; commandSchemasByName: Record<string, Message> } {
    const commandSchemasByName: Record<string, Message> = {};

    const commands: Message[] = gwtSpecs
        .map((gwt): Message | undefined => {
            const cmd = gwt.when;
            if (!cmd.commandRef) return undefined;

            const fields = extractFieldsFromMessage(cmd.commandRef, 'command', allMessages);

            const command: Message = {
                type: cmd.commandRef,
                fields,
                source: 'when',
            };

            commandSchemasByName[cmd.commandRef] = command;
            return command;
        })
        .filter((cmd): cmd is Message => cmd !== undefined);

    return { commands, commandSchemasByName };
}

