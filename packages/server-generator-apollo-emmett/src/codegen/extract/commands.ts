import { CommandExample, EventExample } from '@auto-engineer/narrative';
import { Message, MessageDefinition } from '../types';
import { extractFieldsFromMessage } from './fields';

function createCommandMessage(
  commandRef: string,
  allMessages: MessageDefinition[],
  source: 'when' | 'then',
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
    given?: Array<EventExample | unknown>;
    when: CommandExample | EventExample | unknown[];
    then: Array<EventExample | unknown | { errorType: string; message?: string }>;
  }>,
  allMessages: MessageDefinition[],
): { commands: Message[]; commandSchemasByName: Record<string, Message> } {
  const commandSchemasByName: Record<string, Message> = {};

  const commands: Message[] = gwtSpecs
    .map((gwt): Message | undefined => {
      const cmd = gwt.when;
      if (
        Array.isArray(cmd) ||
        typeof cmd !== 'object' ||
        cmd === null ||
        !('commandRef' in cmd) ||
        typeof cmd.commandRef !== 'string' ||
        !cmd.commandRef
      )
        return undefined;
      const command = createCommandMessage(cmd.commandRef, allMessages, 'when');
      if (command) {
        commandSchemasByName[cmd.commandRef] = command;
      }
      return command;
    })
    .filter((cmd): cmd is Message => cmd !== undefined);

  return { commands, commandSchemasByName };
}

function isValidCommandExample(commandExample: unknown): commandExample is { commandRef: string } {
  return (
    typeof commandExample === 'object' &&
    commandExample !== null &&
    'commandRef' in commandExample &&
    typeof commandExample.commandRef === 'string' &&
    !!commandExample.commandRef
  );
}

function processCommandExample(
  commandExample: unknown,
  commands: Message[],
  commandSchemasByName: Record<string, Message>,
  allMessages: MessageDefinition[],
): void {
  if (!isValidCommandExample(commandExample)) {
    return;
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

export function extractCommandsFromThen(
  gwtSpecs: Array<{
    given?: Array<EventExample | unknown>;
    when: CommandExample | EventExample | unknown[];
    then: Array<EventExample | unknown | { errorType: string; message?: string }>;
  }>,
  allMessages: MessageDefinition[],
): { commands: Message[]; commandSchemasByName: Record<string, Message> } {
  const commands: Message[] = [];
  const commandSchemasByName: Record<string, Message> = {};

  for (const gwt of gwtSpecs) {
    if (!Array.isArray(gwt.then)) {
      continue;
    }

    for (const commandExample of gwt.then) {
      processCommandExample(commandExample, commands, commandSchemasByName, allMessages);
    }
  }

  return { commands, commandSchemasByName };
}
