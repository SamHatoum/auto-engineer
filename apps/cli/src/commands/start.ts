import { Command } from 'commander';
import inquirer from 'inquirer';
import ora, { type Ora } from 'ora';
import chalk from 'chalk';
import { Config } from '../utils/config.js';
import { createOutput } from '../utils/terminal.js';
import { handleError } from '../utils/errors.js';
import { Analytics } from '../utils/analytics.js';
import { createMessageBus } from '@auto-engineer/message-bus';
import { createFlowCommandHandler, CreateFlowCommand, handleCreateFlowCommand } from '@auto-engineer/flowlang-agent';
import { type AppSchema } from '@auto-engineer/flowlang';

// Type definitions for better type safety
interface Flow {
  name: string;
  slices?: Slice[];
}

interface Slice {
  name: string;
  stream?: string;
  integrations?: string[];
  specs?: {
    client?: ClientSpec;
    server?: ServerSpec;
  };
  client?: ClientSpec;
  server?: ServerSpec;
}

interface ClientSpec {
  component?: string;
  description?: string;
  name?: string;
  should?: string[];
  specs?: string[];
}

interface ServerSpec {
  description?: string;
  name?: string;
  gwt?: GWT;
  transitions?: string[];
  specs?: string[];
}

interface GWT {
  given?: EventRef[];
  when?: CommandRef | EventRef[];
  then?: EventRef[] | StateRef[];
}

interface EventRef {
  eventRef?: string;
  name?: string;
}

interface CommandRef {
  commandRef?: string;
  name?: string;
}

interface StateRef {
  stateRef?: string;
  name?: string;
}

interface Message {
  type: 'command' | 'event' | 'state';
  name: string;
  description?: string;
  fields?: Field[];
}

interface Field {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

interface Integration {
  name: string;
  description?: string;
  source?: string;
}

type SpecsSchema = AppSchema & {
  messages?: Message[];
  integrations?: Integration[];
};

// Color constants matching demo.ts
const COLORS = {
  SPECS_TEXT: chalk.hex('#A0A0A0'),
  SPECS_LABEL: chalk.italic,
  EVENTS: chalk.hex('#FFA500'),
  COMMANDS: chalk.hex('#7FDBFF'),
  STATE: chalk.green,
  FLOW_TEXT: chalk.bold.blue,
  STREAM_BRACKETS: chalk.yellow,
  INTEGRATIONS_BRACKETS: chalk.magenta,
  SOURCE_BRACKETS: chalk.gray,
  SLICE_TEXT: chalk.white.bold,
  CLIENT_SERVER: chalk.hex('#4ECDC4'),
};

// Type guards
const isFlow = (obj: unknown): obj is Flow => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as Flow).name === 'string' &&
    (obj as Flow).name.length > 0
  );
};

const isSlice = (obj: unknown): obj is Slice => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as Slice).name === 'string' &&
    (obj as Slice).name.length > 0
  );
};

const isCommandRef = (obj: unknown): obj is CommandRef => {
  return typeof obj === 'object' && obj !== null && ('commandRef' in obj || 'name' in obj);
};

// Helper functions to break down complexity
const addFlowHeader = (flow: Flow, flowIndex: number, lines: string[]): void => {
  if (flowIndex > 0) lines.push(''); // Add spacing between flows
  lines.push(`# **Flow:** ${flow.name}`);
};

const addSliceInfo = (slice: Slice, lines: string[]): void => {
  let sliceLine = `* **Slice:** ${slice.name}`;
  if (slice.stream != null && slice.stream.length > 0) {
    sliceLine += ` [stream: ${slice.stream}]`;
  }
  if (slice.integrations != null && slice.integrations.length > 0) {
    sliceLine += ` [integrations: ${slice.integrations.join(', ')}]`;
  }
  lines.push(sliceLine);
};

const addClientSpecs = (clientData: ClientSpec, lines: string[]): void => {
  const clientDesc = clientData.component ?? clientData.description ?? clientData.name ?? 'Component';
  lines.push(`  * **Client:** ${clientDesc}`);

  // Handle "should" array or specs array
  const specs = clientData.should ?? clientData.specs ?? [];
  if (Array.isArray(specs)) {
    specs.forEach((spec: string) => {
      if (spec?.length > 0) {
        lines.push(`      ${spec}`);
      }
    });
  }
};

// Helper to process single event transition
const processSingleEventTransition = (event: unknown, commandName: string, transitions: string[]): void => {
  if (typeof event === 'object' && event !== null && 'eventRef' in event) {
    const eventName = (event as EventRef).eventRef ?? (event as EventRef).name;
    if (eventName != null && eventName.length > 0) {
      transitions.push(`Commands.${commandName} => Events.${eventName}`);
    }
  }
};

const processCommandTransitions = (gwt: GWT, transitions: string[]): void => {
  if (gwt.when && isCommandRef(gwt.when) && gwt.then) {
    const commandName = gwt.when.commandRef ?? gwt.when.name ?? 'Command';
    if (Array.isArray(gwt.then)) {
      gwt.then.forEach((event: unknown) => {
        processSingleEventTransition(event, commandName, transitions);
      });
    } else if (gwt.then) {
      processSingleEventTransition(gwt.then, commandName, transitions);
    }
  }
};

// Helper to process state transitions from event
const processStateTransitions = (eventName: string, then: unknown[] | unknown, transitions: string[]): void => {
  if (Array.isArray(then)) {
    then.forEach((state: unknown) => {
      if (typeof state === 'object' && state !== null && 'stateRef' in state) {
        const stateName = (state as StateRef).stateRef ?? (state as StateRef).name;
        if (stateName != null && stateName.length > 0) {
          transitions.push(`Events.${eventName} => State.${stateName}`);
        }
      }
    });
  } else if (then != null) {
    const stateName = (then as StateRef).stateRef ?? (then as StateRef).name;
    if (stateName != null && stateName.length > 0) {
      transitions.push(`Events.${eventName} => State.${stateName}`);
    }
  }
};

const processQueryTransitions = (gwt: GWT, transitions: string[]): void => {
  if (gwt.given && gwt.then && !gwt.when) {
    if (Array.isArray(gwt.given)) {
      gwt.given.forEach((event: unknown) => {
        if (typeof event === 'object' && event !== null && 'eventRef' in event) {
          const eventName = (event as EventRef).eventRef ?? (event as EventRef).name;
          if (eventName != null && eventName.length > 0) {
            processStateTransitions(eventName, gwt.then, transitions);
          }
        }
      });
    }
  }
};

const processReactTransitions = (gwt: GWT, transitions: string[]): void => {
  if (gwt.when && gwt.then && Array.isArray(gwt.when)) {
    gwt.when.forEach((event: unknown) => {
      if (typeof event === 'object' && event !== null && 'eventRef' in event) {
        const eventName = (event as EventRef).eventRef ?? (event as EventRef).name;
        if (eventName != null && eventName.length > 0) {
          if (Array.isArray(gwt.then)) {
            gwt.then.forEach((command: unknown) => {
              if (typeof command === 'object' && command !== null && 'commandRef' in command) {
                const commandName = (command as CommandRef).commandRef ?? (command as CommandRef).name;
                if (commandName != null && commandName.length > 0) {
                  transitions.push(`Events.${eventName} => Commands.${commandName}`);
                }
              }
            });
          }
        }
      }
    });
  }
};

const addServerSpecs = (serverData: ServerSpec, lines: string[]): void => {
  const serverDesc = serverData.description ?? serverData.name ?? 'Server logic';
  lines.push(`  * **Server:** ${serverDesc}`);

  // Extract GWT (Given-When-Then) and convert to transitions
  const transitions: string[] = [];

  if (serverData.gwt) {
    const gwt = serverData.gwt;
    processCommandTransitions(gwt, transitions);
    processQueryTransitions(gwt, transitions);
    processReactTransitions(gwt, transitions);
  }

  // Also check for pre-formatted transitions
  const directTransitions = serverData.transitions || serverData.specs || [];
  if (Array.isArray(directTransitions)) {
    transitions.push(...directTransitions);
  }

  // Display transitions
  if (transitions.length > 0) {
    transitions.forEach((transition: string) => {
      lines.push(`      ${transition}`);
    });
  }
};

const addSliceSpecs = (slice: Slice, lines: string[]): void => {
  if (slice.specs || slice.client || slice.server) {
    // Client specs
    const clientData = slice.specs?.client || slice.client;
    if (clientData) {
      addClientSpecs(clientData, lines);
    }

    // Server specs
    const serverData = slice.specs?.server || slice.server;
    if (serverData) {
      addServerSpecs(serverData, lines);
    }
  }
};

const addMessageFields = (message: Message, lines: string[]): void => {
  if (message.fields && Array.isArray(message.fields)) {
    message.fields.forEach((field: Field) => {
      const required = field.required !== false ? ' (required)' : ' (optional)';
      const description = field.description != null && field.description.length > 0 ? ` - ${field.description}` : '';
      lines.push(`      - ${field.name}: ${field.type}${required}${description}`);
    });
  }
};

const addMessageGroup = (messages: Message[], type: string, lines: string[]): void => {
  if (messages.length > 0) {
    lines.push(`* **${type}:**`);
    messages.forEach((msg: Message) => {
      const description = msg.description != null && msg.description.length > 0 ? `: ${msg.description}` : '';
      lines.push(`  * **${msg.name}**${description}`);
      addMessageFields(msg, lines);
    });
  }
};

const addMessages = (specsSchema: SpecsSchema, lines: string[]): void => {
  if (specsSchema.messages && Array.isArray(specsSchema.messages) && specsSchema.messages.length > 0) {
    lines.push('');
    lines.push('# **Messages**');

    // Group messages by type
    const commands = specsSchema.messages.filter((m: Message) => m.type === 'command');
    const events = specsSchema.messages.filter((m: Message) => m.type === 'event');
    const states = specsSchema.messages.filter((m: Message) => m.type === 'state');

    addMessageGroup(commands, 'Commands', lines);
    addMessageGroup(events, 'Events', lines);
    addMessageGroup(states, 'States', lines);
  }
};

const addIntegrations = (specsSchema: SpecsSchema, lines: string[]): void => {
  if (specsSchema.integrations && Array.isArray(specsSchema.integrations) && specsSchema.integrations.length > 0) {
    lines.push('');
    lines.push('# **Integrations**');
    specsSchema.integrations.forEach((integration: Integration) => {
      const description =
        integration.description != null && integration.description.length > 0 ? `: ${integration.description}` : '';
      lines.push(`* **${integration.name}**${description}`);
      if (integration.source != null && integration.source.length > 0) {
        lines.push(`    Source: ${integration.source}`);
      }
    });
  }
};

// Convert AppSchema to text format for display (matches demo.ts format)
function convertToTextFormat(appSchema: AppSchema, variant: 'flow-names' | 'slice-names' | 'specs'): string[] {
  const lines: string[] = [];

  if (appSchema.flows == null || appSchema.flows.length === 0) {
    return lines;
  }

  appSchema.flows.forEach((flow: unknown, flowIndex: number) => {
    if (!isFlow(flow)) return;

    addFlowHeader(flow, flowIndex, lines);

    // For flow-names variant, stop here
    if (variant === 'flow-names') {
      return;
    }

    // Add slices
    if (flow.slices && Array.isArray(flow.slices)) {
      flow.slices.forEach((slice: unknown) => {
        if (!isSlice(slice)) return;

        addSliceInfo(slice, lines);

        // For slice-names variant, stop here
        if (variant === 'slice-names') {
          return;
        }

        addSliceSpecs(slice, lines);
      });
    }
  });

  // Add messages and integrations for specs variant
  if (variant === 'specs') {
    const specsSchema = appSchema as SpecsSchema; // Cast to specs variant
    addMessages(specsSchema, lines);
    addIntegrations(specsSchema, lines);
  }

  return lines;
}

// Helper functions to reduce complexity
const colorSpecsLine = (line: string, parentIndent: string): string => {
  const noBullet = line.replace(/^\s*\*\s*/, '');
  let specsLine = noBullet.replace(/_+Specs:_+/, COLORS.SPECS_LABEL('Specs:'));
  // Color Events, Commands, State in specs
  specsLine = specsLine.replace(/\bEvents?\.\w+/gi, (match) => COLORS.EVENTS(match));
  specsLine = specsLine.replace(/\bCommands?\.\w+/gi, (match) => COLORS.COMMANDS(match));
  specsLine = specsLine.replace(/\bStates?\.\w+/gi, (match) => COLORS.STATE(match));
  return COLORS.SPECS_TEXT(parentIndent + specsLine.trimStart());
};

const colorFlowHeader = (line: string): string => {
  const match = line.match(/(.*?)(\[[^\]]+\])/i);
  if (match) {
    let before = match[1].replace(/^#\s*/, '').replace(/\*\*/g, '');
    const bracket = match[2];
    // Color Events, Commands, State in the text part
    before = before.replace(/\bEvents?\.\w+/gi, (match) => COLORS.EVENTS(match));
    before = before.replace(/\bCommands?\.\w+/gi, (match) => COLORS.COMMANDS(match));
    before = before.replace(/\bStates?\.\w+/gi, (match) => COLORS.STATE(match));
    if (/^\[stream:/i.test(bracket)) return COLORS.FLOW_TEXT(before) + COLORS.STREAM_BRACKETS(bracket);
    if (/^\[integrations:/i.test(bracket)) return COLORS.FLOW_TEXT(before) + COLORS.INTEGRATIONS_BRACKETS(bracket);
    if (/^\[\.?\/?src\//i.test(bracket)) return COLORS.FLOW_TEXT(before) + COLORS.SOURCE_BRACKETS(bracket);
    return COLORS.FLOW_TEXT(before) + COLORS.SOURCE_BRACKETS(bracket);
  }
  let cleanLine = line.replace(/^#\s*/, '').replace(/\*\*/g, '');
  // Color Events, Commands, State
  cleanLine = cleanLine.replace(/\bEvents?\.\w+/gi, (match) => COLORS.EVENTS(match));
  cleanLine = cleanLine.replace(/\bCommands?\.\w+/gi, (match) => COLORS.COMMANDS(match));
  cleanLine = cleanLine.replace(/\bStates?\.\w+/gi, (match) => COLORS.STATE(match));
  return COLORS.FLOW_TEXT(cleanLine);
};

const colorSliceLine = (line: string): string => {
  let cleanLine = line.replace(/^\*\s*/, '').replace(/\*\*/g, '');
  // Color brackets
  cleanLine = cleanLine.replace(/\[[^\]]+\]/gi, (bracket) => {
    if (/^\[stream:/i.test(bracket)) return COLORS.STREAM_BRACKETS(bracket);
    if (/^\[integrations:/i.test(bracket)) return COLORS.INTEGRATIONS_BRACKETS(bracket);
    if (/^\[\.?\/?src\//i.test(bracket)) return COLORS.SOURCE_BRACKETS(bracket);
    return COLORS.SOURCE_BRACKETS(bracket);
  });
  // Color Events, Commands, State
  cleanLine = cleanLine.replace(/\bEvents?\.\w+/gi, (match) => COLORS.EVENTS(match));
  cleanLine = cleanLine.replace(/\bCommands?\.\w+/gi, (match) => COLORS.COMMANDS(match));
  cleanLine = cleanLine.replace(/\bStates?\.\w+/gi, (match) => COLORS.STATE(match));
  return COLORS.SLICE_TEXT('  ' + cleanLine);
};

const colorClientServerLine = (line: string): string => {
  let cleanLine = line
    .trim()
    .replace(/^\*\s*/, '')
    .replace(/\*\*/g, '');
  // Color Events, Commands, State
  cleanLine = cleanLine.replace(/\bEvents?\.\w+/gi, (match) => COLORS.EVENTS(match));
  cleanLine = cleanLine.replace(/\bCommands?\.\w+/gi, (match) => COLORS.COMMANDS(match));
  cleanLine = cleanLine.replace(/\bStates?\.\w+/gi, (match) => COLORS.STATE(match));
  return COLORS.CLIENT_SERVER.italic('    ' + cleanLine);
};

const colorMessageHeader = (line: string): string => {
  const cleanLine = line.replace(/^\*\s*/, '');
  if (/Commands/i.test(cleanLine)) {
    return COLORS.COMMANDS(cleanLine);
  } else if (/Events/i.test(cleanLine)) {
    return COLORS.EVENTS(cleanLine);
  } else if (/States/i.test(cleanLine)) {
    return COLORS.STATE(cleanLine);
  }
  return cleanLine;
};

const colorMessageName = (line: string, arr: string[], idx: number): string => {
  let cleanLine = line;
  // Check parent category by looking backwards
  for (let i = idx - 1; i >= 0; i--) {
    if (/^\*\s*\*\*?(Commands)[:]?\*\*/i.test(arr[i])) {
      cleanLine = cleanLine.replace(/(\*\*\w+\*\*)/, (match) => COLORS.COMMANDS(match.replace(/\*\*/g, '')));
      break;
    } else if (/^\*\s*\*\*?(Events)[:]?\*\*/i.test(arr[i])) {
      cleanLine = cleanLine.replace(/(\*\*\w+\*\*)/, (match) => COLORS.EVENTS(match.replace(/\*\*/g, '')));
      break;
    } else if (/^\*\s*\*\*?(States)[:]?\*\*/i.test(arr[i])) {
      cleanLine = cleanLine.replace(/(\*\*\w+\*\*)/, (match) => COLORS.STATE(match.replace(/\*\*/g, '')));
      break;
    }
  }
  return cleanLine;
};

const colorFieldDefinition = (line: string): string => {
  let cleanLine = line;
  // Color field types
  cleanLine = cleanLine.replace(/:\s*(string|number|boolean|Date|UUID|object|array)(\s|$)/gi, (match, type) => {
    return ': ' + chalk.cyan(type) + match.substring(match.indexOf(type) + (type as string).length);
  });
  // Color (required) and (optional)
  cleanLine = cleanLine.replace(/\(required\)/gi, chalk.red('(required)'));
  cleanLine = cleanLine.replace(/\(optional\)/gi, chalk.green('(optional)'));
  return COLORS.SPECS_TEXT(cleanLine);
};

const colorIntegrationName = (line: string, arr: string[], idx: number): string => {
  // Check if we're in the Integrations section
  for (let i = idx - 1; i >= 0; i--) {
    if (/^#\s*\*\*?Integrations/i.test(arr[i])) {
      let cleanLine = line.replace(/^\*\s*/, '');
      cleanLine = cleanLine.replace(/\*\*/g, '');
      return COLORS.INTEGRATIONS_BRACKETS('* ' + cleanLine);
    }
    if (/^#\s*\*\*?(Flow|Messages)/i.test(arr[i])) {
      break; // Stop if we hit a different section
    }
  }
  return line;
};

const colorBrackets = (line: string): string => {
  return line.replace(/\[[^\]]+\]/gi, (bracket) => {
    if (/^\[stream:/i.test(bracket)) return COLORS.STREAM_BRACKETS(bracket);
    if (/^\[integrations:/i.test(bracket)) return COLORS.INTEGRATIONS_BRACKETS(bracket);
    if (/^\[\.?\/?src\//i.test(bracket)) return COLORS.SOURCE_BRACKETS(bracket);
    return COLORS.SOURCE_BRACKETS(bracket);
  });
};

// Helper to find parent indent for specs lines
const findParentIndent = (idx: number, arr: string[]): string => {
  let parentIndent = '      '; // Default to 6 spaces
  for (let i = idx - 1; i >= 0; i--) {
    if (/^\s*\*\s*\*\*?(Client|Server)[:]?.*/i.test(arr[i])) {
      parentIndent = '      ';
      break;
    }
  }
  return parentIndent;
};

// Helper to check if line is a specs line
const isSpecsLine = (line: string): boolean => {
  return /\*\s*_+Specs:_+/.test(line);
};

// Helper to check if line is a flow header
const isFlowHeader = (line: string): boolean => {
  return /^#\s*\*\*?(Flow|Messages|Integrations)[:]?.*/i.test(line);
};

// Helper to check and color specific line types
const colorSpecialLines = (line: string, idx: number, arr: string[]): string | null => {
  if (isSpecsLine(line)) {
    return colorSpecsLine(line, findParentIndent(idx, arr));
  }
  if (isFlowHeader(line)) {
    return colorFlowHeader(line);
  }
  if (/^\*\s*\*\*?Slice[:]?.*/i.test(line)) {
    return colorSliceLine(line);
  }
  if (/^\s*\*\s*\*\*?(Client|Server)[:]?.*/i.test(line)) {
    return colorClientServerLine(line);
  }
  return null;
};

// Helper to color message-related lines
const colorMessageLines = (line: string, arr: string[], idx: number): string | null => {
  if (/^\*\s*\*\*?(Commands|Events|States)[:]?\*\*/i.test(line)) {
    return colorMessageHeader(line);
  }
  if (/^\s{2}\*\s*\*\*\w+\*\*/.test(line)) {
    return colorMessageName(line, arr, idx);
  }
  if (/^\s+-\s+/.test(line)) {
    return colorFieldDefinition(line);
  }
  return null;
};

// Render text lines with colors (copied from demo.ts)
const colorizeLine = (line: string, idx: number, arr: string[]): string => {
  const specialColor = colorSpecialLines(line, idx, arr);
  if (specialColor != null) return specialColor;

  const messageColor = colorMessageLines(line, arr, idx);
  if (messageColor != null) return messageColor;

  return colorOtherLines(line, arr, idx);
};

// Helper to color remaining line types
const colorOtherLines = (line: string, arr: string[], idx: number): string => {
  // Color integration names (under Integrations section)
  if (/^\*\s*\*\*\w+\*\*/.test(line) && idx > 0) {
    return colorIntegrationName(line, arr, idx);
  }

  // Color "Source:" lines
  if (/^\s+Source:/.test(line)) {
    return COLORS.SOURCE_BRACKETS(line);
  }

  let coloredLine = colorBrackets(line);
  // Color Events, Commands, State
  coloredLine = coloredLine.replace(/\bEvents?\.\w+/gi, (match) => COLORS.EVENTS(match));
  coloredLine = coloredLine.replace(/\bCommands?\.\w+/gi, (match) => COLORS.COMMANDS(match));
  coloredLine = coloredLine.replace(/\bStates?\.\w+/gi, (match) => COLORS.STATE(match));
  return coloredLine;
};

function renderColoredText(lines: string[]): string {
  return lines.map(colorizeLine).join('\n');
}

// Initialize message bus
const messageBus = createMessageBus();
messageBus.registerCommandHandler(createFlowCommandHandler);

interface StreamData {
  flows?: Flow[];
  messages?: Message[];
  integrations?: Integration[];
}

async function sendFlowCommand(
  prompt: string,
  variant: 'flow-names' | 'slice-names' | 'client-server-names' | 'specs',
  onStream?: (data: unknown) => void,
): Promise<AppSchema> {
  const command: CreateFlowCommand = {
    type: 'CreateFlow',
    data: {
      prompt,
      variant,
      useStreaming: true,
      streamCallback: onStream,
    },
    requestId: `req-${Date.now()}`,
    timestamp: new Date(),
  };

  // Use direct function call for now to get return value
  return await handleCreateFlowCommand(command);
}

const validateAppPrompt = (input: string): true | string => {
  if (input.trim().length === 0) {
    return 'Please describe what you want us to build';
  }
  if (input.trim().length < 10) {
    return 'Please provide a more detailed description (at least 10 characters)';
  }
  return true;
};

const getAppPrompt = async (output: ReturnType<typeof createOutput>): Promise<string> => {
  const answers = await inquirer.prompt<{ appPrompt: string }>([
    {
      type: 'input',
      name: 'appPrompt',
      message: 'What would you like to start building together?\n(NOTE: NOT FULLY FUNCTIONAL YET!)',
      validate: validateAppPrompt,
      transformer: (input: string) => input.trim(),
    },
  ]);

  output.debug(`User wants to build: ${answers.appPrompt}`);
  return answers.appPrompt;
};

const generateFlowNames = async (currentPrompt: string, iteration: number, flowSpinner: Ora): Promise<AppSchema> => {
  return await sendFlowCommand(currentPrompt, 'flow-names', (partialData: unknown) => {
    const data = partialData as StreamData;
    if (data.flows && Array.isArray(data.flows)) {
      flowSpinner.text = chalk.gray(`Generated ${data.flows.length} flows...`);
    }
  });
};

const displayFlows = (flowNamesData: AppSchema): void => {
  console.log();
  const flowTextLines = convertToTextFormat(flowNamesData, 'flow-names');
  console.log(renderColoredText(flowTextLines));
  console.log();
};

const getConfirmation = async (): Promise<string> => {
  const answers = await inquirer.prompt<{ confirmation: string }>([
    {
      type: 'input',
      name: 'confirmation',
      message:
        chalk.cyan('Is this on point or would you like to make changes?\n') +
        chalk.gray('  Press ') +
        chalk.green('Enter') +
        chalk.gray(', type ') +
        chalk.green('Yes') +
        chalk.gray(' or ') +
        chalk.green('Y') +
        chalk.gray(" to continue, or describe what changes you'd like:"),
      transformer: (input: string) => input.trim(),
    },
  ]);
  return answers.confirmation ?? '';
};

const isUserSatisfied = (confirmation: string): boolean => {
  const lowerConfirmation = confirmation.toLowerCase();
  return lowerConfirmation === '' || lowerConfirmation === 'yes' || lowerConfirmation === 'y';
};

const updatePromptForChanges = (appPrompt: string, flowNamesData: AppSchema, confirmation: string): string => {
  const previousFlows =
    flowNamesData.flows
      ?.slice(0, 4)
      .map((f) => f.name)
      .join(', ') || '';
  return `Original request: ${appPrompt}

Previously generated flows: ${previousFlows}

User feedback: ${confirmation}

Please generate 4 new flows based on this feedback.`;
};

const buildSpecsPrompt = (appPrompt: string, flowNames: string): string => {
  return `Based on the application: ${appPrompt}

For these flows: ${flowNames}

Generate complete specifications following the AppSchema format with:
1. flows: Array of flows, each containing:
   - Multiple slices per flow
   - For each slice, include:
     - name: slice name
     - type: 'command' or 'query' or 'react'
     - client: {
         description: "Component description",
         specs: ["should have...", "should display...", etc]
       }
     - server: {
         description: "Server logic description",
         gwt: {
           given: [{ eventRef: "EventName" }] (optional for commands),
           when: { commandRef: "CommandName" } (for commands),
           then: [{ eventRef: "EventName" }] (or stateRef for queries)
         }
       }

2. messages: Array of all Commands, Events, and States referenced in the flows:
   - type: 'command' | 'event' | 'state'
   - name: The message name (without Commands/Events/State prefix)
   - description: What it represents
   - fields: Array of field definitions with name, type, required, and description

3. integrations: (optional) Array of external integrations if any slices use them:
   - name: Integration name (e.g., "MailChimp", "Twilio")
   - description: What it does
   - source: NPM package name (e.g., "@auto-engineer/mailchimp-integration")

The GWT (Given-When-Then) structure defines state transitions:
- Command slices: when (command) => then (events)
- Query slices: given (events) => then (state updates)
- React slices: when (events) => then (commands)

Make sure to stream the data progressively, showing flows first, then messages, then integrations.`;
};

// Helper to stop spinner and clear console
const stopSpinnerAndClear = (specSpinner: Ora): void => {
  if (specSpinner.isSpinning) {
    specSpinner.stop();
  }
  console.clear();
};

// Helper to render header
const renderStreamHeader = (): void => {
  console.log(chalk.cyan('Building up your flows...'));
  console.log();
  console.log(chalk.gray('Full specifications'));
  console.log(chalk.gray('─'.repeat(50)));
};

// Helper to log debug info
const logDebugInfo = (partialData: StreamData, output: ReturnType<typeof createOutput>, updateCount: number): void => {
  const firstSlice = partialData.flows?.[0]?.slices?.[0];
  if (firstSlice != null) {
    output.debug(`Stream update ${updateCount}: ${JSON.stringify(firstSlice, null, 2)}`);
  }
};

const handleStreamUpdate = (
  partialData: StreamData,
  specSpinner: Ora,
  output: ReturnType<typeof createOutput>,
  updateCount: number,
): void => {
  if (partialData.flows != null && Array.isArray(partialData.flows)) {
    stopSpinnerAndClear(specSpinner);
    renderStreamHeader();

    // Render the current state with full specs
    const specTextLines = convertToTextFormat(partialData as AppSchema, 'specs');
    console.log(renderColoredText(specTextLines));

    logDebugInfo(partialData, output, updateCount);
  }
};

const generateSpecs = async (
  specsPrompt: string,
  specSpinner: Ora,
  output: ReturnType<typeof createOutput>,
): Promise<void> => {
  let updateCount = 0;
  await sendFlowCommand(specsPrompt, 'specs', (partialData: unknown) => {
    updateCount++;
    handleStreamUpdate(partialData as StreamData, specSpinner, output, updateCount);
  });

  // Final success message
  console.log();
  console.log(chalk.green('✅ Complete flow structure generated!'));
};

const showNextSteps = (): void => {
  console.log();
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('- Review the generated flow specifications'));
  console.log(chalk.gray('- Refine any slices or specifications as needed'));
  console.log(chalk.gray('- Generate the actual code implementation'));
};

// Helper to handle flow generation loop
const generateFlowsLoop = async (appPrompt: string, _output: ReturnType<typeof createOutput>): Promise<AppSchema> => {
  let flowNamesData: AppSchema;
  let currentPrompt = appPrompt;
  let iteration = 0;

  while (true) {
    const flowSpinner = ora({
      text: chalk.gray(iteration === 0 ? 'Generating some flows...' : 'Regenerating flows with your feedback...'),
      spinner: 'dots',
    }).start();

    try {
      flowNamesData = await generateFlowNames(currentPrompt, iteration, flowSpinner);
      flowSpinner.succeed(chalk.green('Flows generated successfully!'));
    } catch (error) {
      flowSpinner.fail(chalk.red('Failed to generate flows'));
      throw error;
    }

    if (flowNamesData.flows == null || flowNamesData.flows.length === 0) {
      console.log(chalk.yellow('No flows were generated. Please try with a different prompt.'));
      throw new Error('No flows generated');
    }

    displayFlows(flowNamesData);
    const confirmation = await getConfirmation();

    if (isUserSatisfied(confirmation)) {
      break;
    }

    currentPrompt = updatePromptForChanges(appPrompt, flowNamesData, confirmation);
    iteration++;
  }

  return flowNamesData;
};

// Helper to handle specs generation
const generateSpecsStep = async (
  appPrompt: string,
  flowNamesData: AppSchema,
  output: ReturnType<typeof createOutput>,
): Promise<void> => {
  console.log();
  console.log(chalk.cyan('Building up your flows...'));
  console.log();

  const specSpinner = ora({
    text: chalk.gray('Generating full specifications...'),
    spinner: 'dots',
  }).start();

  try {
    const flowNames = flowNamesData.flows?.map((f) => f.name).join(', ') ?? '';
    const specsPrompt = buildSpecsPrompt(appPrompt, flowNames);
    await generateSpecs(specsPrompt, specSpinner, output);
  } catch (error) {
    if (specSpinner.isSpinning) {
      specSpinner.fail(chalk.red('Failed to generate specifications'));
    } else {
      console.log(chalk.red('\n❌ Failed to generate specifications'));
    }
    throw error;
  }
};

export const createStartCommand = (config: Config, analytics: Analytics) => {
  const output = createOutput(config);

  return new Command('start').description('Create flows interactively using AI').action(async () => {
    try {
      output.debug('Start command initiated');
      const appPrompt = await getAppPrompt(output);
      const flowNamesData = await generateFlowsLoop(appPrompt, output);
      await generateSpecsStep(appPrompt, flowNamesData, output);
      showNextSteps();
      await analytics.trackCommand('start', true);
      output.debug('Start command completed successfully');
    } catch (error: unknown) {
      await analytics.trackCommand('start', false, error instanceof Error && error.message ? error.message : 'unknown');
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(new Error(String(error)));
      }
    }
  });
};
