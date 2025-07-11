import {CommandExample, EventExample} from "@auto-engineer/flowlang";
import {Message, MessageDefinition} from "../types";
import {extractFieldsFromMessage} from "./fields";
import {ReactGwtSpec} from "./messages";

function createCommandMessage(
    commandRef: string,
    allMessages: MessageDefinition[],
    source: 'when' | 'then'
): Message | undefined {
    const fields = extractFieldsFromMessage(commandRef, 'command', allMessages);

    if (fields.length === 0 && source === 'then') {
        return undefined;
    }

    return {
        type: commandRef,
        fields,
        source,
    };
}

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

            const command = createCommandMessage(cmd.commandRef, allMessages, 'when');
            if (command) {
                commandSchemasByName[cmd.commandRef] = command;
            }
            return command;
        })
        .filter((cmd): cmd is Message => cmd !== undefined);

    return { commands, commandSchemasByName };
}

export function extractCommandsFromThen(
    gwtSpecs: ReactGwtSpec[],
    allMessages: MessageDefinition[]
): { commands: Message[], commandSchemasByName: Record<string, Message> } {
    const commands: Message[] = [];
    const commandSchemasByName: Record<string, Message> = {};

    for (const gwt of gwtSpecs) {
        if (!Array.isArray(gwt.then)) {
            continue;
        }

        for (const commandExample of gwt.then) {
            if (!commandExample.commandRef) {
                continue;
            }

            const commandRef = commandExample.commandRef;
            if (!(commandRef in commandSchemasByName)) {
                const command = createCommandMessage(commandRef, allMessages, 'then');
                if (command) {
                    commands.push(command);
                    commandSchemasByName[commandRef] = command;
                }
            }
        }
    }

    return { commands, commandSchemasByName };
}