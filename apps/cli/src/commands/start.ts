import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { Config } from '../utils/config.js';
import { createOutput } from '../utils/terminal.js';
import { handleError } from '../utils/errors.js';
import { Analytics } from '../utils/analytics.js';
import { MessageBus } from '@auto-engineer/message-bus';
import { createFlowCommandHandler, CreateFlowCommand } from '@auto-engineer/flowlang-agent';
import { type AppSchema } from '@auto-engineer/flowlang';

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

// Convert AppSchema to text format for display (matches demo.ts format)
function convertToTextFormat(appSchema: AppSchema, variant: 'flow-names' | 'slice-names' | 'specs'): string[] {
  const lines: string[] = [];
  
  if (!appSchema.flows || appSchema.flows.length === 0) {
    return lines;
  }
  
  appSchema.flows.forEach((flow: any, flowIndex: number) => {
    if (flowIndex > 0) lines.push(''); // Add spacing between flows
    
    // Add flow line with # prefix for proper coloring
    lines.push(`# **Flow:** ${flow.name}`);
    
    // For flow-names variant, stop here
    if (variant === 'flow-names') {
      return;
    }
    
    // Add slices
    if (flow.slices && Array.isArray(flow.slices)) {
      flow.slices.forEach((slice: any) => {
        let sliceLine = `* **Slice:** ${slice.name}`;
        if (slice.stream) {
          sliceLine += ` [stream: ${slice.stream}]`;
        }
        if (slice.integrations && slice.integrations.length > 0) {
          sliceLine += ` [integrations: ${slice.integrations.join(', ')}]`;
        }
        lines.push(sliceLine);
        
        // For slice-names variant, stop here
        if (variant === 'slice-names') {
          return;
        }
        
        // Add specs for full variant - handle both old and new formats
        if (slice.specs || slice.client || slice.server) {
          // Client specs
          const clientData = slice.specs?.client || slice.client;
          if (clientData) {
            const clientDesc = clientData.component || clientData.description || clientData.name || 'Component';
            lines.push(`  * **Client:** ${clientDesc}`);
            
            // Handle "should" array or specs array
            const specs = clientData.should || clientData.specs || [];
            if (Array.isArray(specs)) {
              specs.forEach((spec: string) => {
                lines.push(`      ${spec}`);
              });
            }
          }
          
          // Server specs
          const serverData = slice.specs?.server || slice.server;
          if (serverData) {
            const serverDesc = serverData.description || serverData.name || 'Server logic';
            lines.push(`  * **Server:** ${serverDesc}`);
            
            // Extract GWT (Given-When-Then) and convert to transitions
            const transitions: string[] = [];
            
            if (serverData.gwt) {
              const gwt = serverData.gwt;
              
              // For command slices: When (command) => Then (events)
              if (gwt.when && gwt.then) {
                const commandName = gwt.when.commandRef || gwt.when.name || 'Command';
                if (Array.isArray(gwt.then)) {
                  gwt.then.forEach((event: any) => {
                    const eventName = event.eventRef || event.name || 'Event';
                    transitions.push(`Commands.${commandName} => Events.${eventName}`);
                  });
                } else if (gwt.then) {
                  const eventName = gwt.then.eventRef || gwt.then.name || 'Event';
                  transitions.push(`Commands.${commandName} => Events.${eventName}`);
                }
              }
              
              // For query slices: Given (events) => Then (state)
              if (gwt.given && gwt.then && !gwt.when) {
                if (Array.isArray(gwt.given)) {
                  gwt.given.forEach((event: any) => {
                    const eventName = event.eventRef || event.name || 'Event';
                    if (Array.isArray(gwt.then)) {
                      gwt.then.forEach((state: any) => {
                        const stateName = state.stateRef || state.name || 'State';
                        transitions.push(`Events.${eventName} => State.${stateName}`);
                      });
                    } else if (gwt.then) {
                      const stateName = gwt.then.stateRef || gwt.then.name || 'State';
                      transitions.push(`Events.${eventName} => State.${stateName}`);
                    }
                  });
                }
              }
              
              // For react slices: When (events) => Then (commands)
              if (gwt.when && gwt.then && Array.isArray(gwt.when)) {
                gwt.when.forEach((event: any) => {
                  const eventName = event.eventRef || event.name || 'Event';
                  if (Array.isArray(gwt.then)) {
                    gwt.then.forEach((command: any) => {
                      const commandName = command.commandRef || command.name || 'Command';
                      transitions.push(`Events.${eventName} => Commands.${commandName}`);
                    });
                  }
                });
              }
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
          }
        }
      });
    }
  });
  
  // Add messages and integrations for specs variant
  if (variant === 'specs') {
    const specsSchema = appSchema as any; // Cast to any since we know it's specs variant
    
    // Add messages if present
    if (specsSchema.messages && Array.isArray(specsSchema.messages) && specsSchema.messages.length > 0) {
      lines.push('');
      lines.push('# **Messages**');
      
      // Group messages by type
      const commands = specsSchema.messages.filter((m: any) => m.type === 'command');
      const events = specsSchema.messages.filter((m: any) => m.type === 'event');
      const states = specsSchema.messages.filter((m: any) => m.type === 'state');
      
      // Display Commands
      if (commands.length > 0) {
        lines.push('* **Commands:**');
        commands.forEach((cmd: any) => {
          lines.push(`  * **${cmd.name}**${cmd.description ? ': ' + cmd.description : ''}`);
          if (cmd.fields && Array.isArray(cmd.fields)) {
            cmd.fields.forEach((field: any) => {
              const required = field.required !== false ? ' (required)' : ' (optional)';
              lines.push(`      - ${field.name}: ${field.type}${required}${field.description ? ' - ' + field.description : ''}`);
            });
          }
        });
      }
      
      // Display Events
      if (events.length > 0) {
        lines.push('* **Events:**');
        events.forEach((evt: any) => {
          lines.push(`  * **${evt.name}**${evt.description ? ': ' + evt.description : ''}`);
          if (evt.fields && Array.isArray(evt.fields)) {
            evt.fields.forEach((field: any) => {
              const required = field.required !== false ? ' (required)' : ' (optional)';
              lines.push(`      - ${field.name}: ${field.type}${required}${field.description ? ' - ' + field.description : ''}`);
            });
          }
        });
      }
      
      // Display States
      if (states.length > 0) {
        lines.push('* **States:**');
        states.forEach((state: any) => {
          lines.push(`  * **${state.name}**${state.description ? ': ' + state.description : ''}`);
          if (state.fields && Array.isArray(state.fields)) {
            state.fields.forEach((field: any) => {
              const required = field.required !== false ? ' (required)' : ' (optional)';
              lines.push(`      - ${field.name}: ${field.type}${required}${field.description ? ' - ' + field.description : ''}`);
            });
          }
        });
      }
    }
    
    // Add integrations if present
    if (specsSchema.integrations && Array.isArray(specsSchema.integrations) && specsSchema.integrations.length > 0) {
      lines.push('');
      lines.push('# **Integrations**');
      specsSchema.integrations.forEach((integration: any) => {
        lines.push(`* **${integration.name}**${integration.description ? ': ' + integration.description : ''}`);
        if (integration.source) {
          lines.push(`    Source: ${integration.source}`);
        }
      });
    }
  }
  
  return lines;
}

// Render text lines with colors (copied from demo.ts)
function renderColoredText(lines: string[]): string {
  return lines.map((line, idx, arr) => {

    // Specs lines: always nest under nearest previous Client/Server line
    if (/\*\s*_+Specs:_+/.test(line)) {
      let parentIndent = '      '; // Default to 6 spaces (nested under Client/Server which are at 4 spaces)
      for (let i = idx - 1; i >= 0; i--) {
        if (/^\s*\*\s*\*\*?(Client|Server)[:]?.*/i.test(arr[i])) {
          // Client/Server lines are at 4 spaces, so Specs should be at 6 spaces
          parentIndent = '      ';
          break;
        }
      }
      const noBullet = line.replace(/^\s*\*\s*/, '');
      let specsLine = noBullet.replace(/_+Specs:_+/, COLORS.SPECS_LABEL('Specs:'));
      // Color Events, Commands, State in specs
      specsLine = specsLine.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
      specsLine = specsLine.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
      specsLine = specsLine.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
      return COLORS.SPECS_TEXT(parentIndent + specsLine.trimStart());
    }
    if (/^#\s*\*\*?(Flow|Messages|Integrations)[:]?.*/i.test(line)) {
      const match = line.match(/(.*?)(\[[^\]]+\])/i);
      if (match) {
        let before = match[1].replace(/^#\s*/, '').replace(/\*\*/g, '');
        const bracket = match[2];
        // Color Events, Commands, State in the text part
        before = before.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
        before = before.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
        before = before.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
        if (/^\[stream:/i.test(bracket)) return COLORS.FLOW_TEXT(before) + COLORS.STREAM_BRACKETS(bracket);
        if (/^\[integrations:/i.test(bracket)) return COLORS.FLOW_TEXT(before) + COLORS.INTEGRATIONS_BRACKETS(bracket);
        if (/^\[\.?\/?src\//i.test(bracket)) return COLORS.FLOW_TEXT(before) + COLORS.SOURCE_BRACKETS(bracket);
        return COLORS.FLOW_TEXT(before) + COLORS.SOURCE_BRACKETS(bracket);
      }
      let cleanLine = line.replace(/^#\s*/, '').replace(/\*\*/g, '');
      // Color Events, Commands, State
      cleanLine = cleanLine.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
      cleanLine = cleanLine.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
      cleanLine = cleanLine.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
      return COLORS.FLOW_TEXT(cleanLine);
    }
    // Slice: white bold text + magenta brackets + colored Events/Commands/State
    if (/^\*\s*\*\*?Slice[:]?.*/i.test(line)) {
      let cleanLine = line.replace(/^\*\s*/, '').replace(/\*\*/g, '');
      // Color brackets
      cleanLine = cleanLine.replace(/\[[^\]]+\]/gi, (bracket) => {
        if (/^\[stream:/i.test(bracket)) return COLORS.STREAM_BRACKETS(bracket);
        if (/^\[integrations:/i.test(bracket)) return COLORS.INTEGRATIONS_BRACKETS(bracket);
        if (/^\[\.?\/?src\//i.test(bracket)) return COLORS.SOURCE_BRACKETS(bracket);
        return COLORS.SOURCE_BRACKETS(bracket);
      });
      // Color Events, Commands, State
      cleanLine = cleanLine.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
      cleanLine = cleanLine.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
      cleanLine = cleanLine.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
      return COLORS.SLICE_TEXT('  ' + cleanLine);
    }
    if (/^\s*\*\s*\*\*?Client[:]?.*/i.test(line)) {
      let cleanLine = line.trim().replace(/^\*\s*/, '').replace(/\*\*/g, '');
      // Color Events, Commands, State
      cleanLine = cleanLine.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
      cleanLine = cleanLine.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
      cleanLine = cleanLine.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
      return COLORS.CLIENT_SERVER.italic('    ' + cleanLine);
    }
    if (/^\s*\*\s*\*\*?Server[:]?.*/i.test(line)) {
      let cleanLine = line.trim().replace(/^\*\s*/, '').replace(/\*\*/g, '');
      // Color Events, Commands, State
      cleanLine = cleanLine.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
      cleanLine = cleanLine.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
      cleanLine = cleanLine.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
      return COLORS.CLIENT_SERVER.italic('    ' + cleanLine);
    }
    // Color Commands:, Events:, States: headers
    if (/^\*\s*\*\*?(Commands|Events|States)[:]?\*\*/i.test(line)) {
      const cleanLine = line.replace(/^\*\s*/, '');
      if (/Commands/i.test(cleanLine)) {
        return COLORS.COMMANDS(cleanLine);
      } else if (/Events/i.test(cleanLine)) {
        return COLORS.EVENTS(cleanLine);
      } else if (/States/i.test(cleanLine)) {
        return COLORS.STATE(cleanLine);
      }
    }
    // Color individual message names (indented with *)
    if (/^\s{2}\*\s*\*\*\w+\*\*/.test(line)) {
      let cleanLine = line;
      // Check parent category by looking backwards
      for (let i = idx - 1; i >= 0; i--) {
        if (/^\*\s*\*\*?(Commands)[:]?\*\*/i.test(arr[i])) {
          cleanLine = cleanLine.replace(/(\*\*\w+\*\*)/, match => COLORS.COMMANDS(match.replace(/\*\*/g, '')));
          break;
        } else if (/^\*\s*\*\*?(Events)[:]?\*\*/i.test(arr[i])) {
          cleanLine = cleanLine.replace(/(\*\*\w+\*\*)/, match => COLORS.EVENTS(match.replace(/\*\*/g, '')));
          break;
        } else if (/^\*\s*\*\*?(States)[:]?\*\*/i.test(arr[i])) {
          cleanLine = cleanLine.replace(/(\*\*\w+\*\*)/, match => COLORS.STATE(match.replace(/\*\*/g, '')));
          break;
        }
      }
      return cleanLine;
    }
    // Color field definitions (lines starting with -)
    if (/^\s+-\s+/.test(line)) {
      let cleanLine = line;
      // Color field types
      cleanLine = cleanLine.replace(/:\s*(string|number|boolean|Date|UUID|object|array)(\s|$)/gi, (match, type) => {
        return ': ' + chalk.cyan(type) + match.substring(match.indexOf(type) + type.length);
      });
      // Color (required) and (optional)
      cleanLine = cleanLine.replace(/\(required\)/gi, chalk.red('(required)'));
      cleanLine = cleanLine.replace(/\(optional\)/gi, chalk.green('(optional)'));
      return COLORS.SPECS_TEXT(cleanLine);
    }
    // Color integration names (under Integrations section)
    if (/^\*\s*\*\*\w+\*\*/.test(line) && idx > 0) {
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
    }
    // Color "Source:" lines
    if (/^\s+Source:/.test(line)) {
      return COLORS.SOURCE_BRACKETS(line);
    }
    let coloredLine = line.replace(/\[[^\]]+\]/gi, (bracket) => {
      if (/^\[stream:/i.test(bracket)) return COLORS.STREAM_BRACKETS(bracket);
      if (/^\[integrations:/i.test(bracket)) return COLORS.INTEGRATIONS_BRACKETS(bracket);
      if (/^\[\.?\/?src\//i.test(bracket)) return COLORS.SOURCE_BRACKETS(bracket);
      return COLORS.SOURCE_BRACKETS(bracket);
    });
    // Color Events, Commands, State
    coloredLine = coloredLine.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
    coloredLine = coloredLine.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
    coloredLine = coloredLine.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
    return coloredLine;
  }).join('\n');
}

// Initialize message bus
const messageBus = new MessageBus();
messageBus.registerCommandHandler(createFlowCommandHandler);

async function sendFlowCommand(
  prompt: string, 
  variant: 'flow-names' | 'slice-names' | 'client-server-names' | 'specs',
  onStream?: (data: any) => void
): Promise<AppSchema> {
  const command: CreateFlowCommand = {
    type: 'CreateFlow',
    requestId: `req-${Date.now()}`,
    timestamp: new Date(),
    prompt,
    variant,
    useStreaming: true,
    streamCallback: onStream
  };

  const response = await messageBus.sendCommand(command);
  
  if (response.status === 'nack') {
    throw new Error(response.error || 'Failed to create flow');
  }

  // Parse the response to get the FlowCreatedEvent
  const event = JSON.parse(response.message || '{}');
  return event.systemData;
}

export const createStartCommand = (config: Config, analytics: Analytics) => {
  const output = createOutput(config);

  return new Command('start')
    .description('Create flows interactively using AI')
    .action(async () => {
      try {
        output.debug('Start command initiated');

        // Step 1: Ask for the app prompt
        const { appPrompt } = await inquirer.prompt([
          {
            type: 'input',
            name: 'appPrompt',
            message: 'What would you like to start building together?',
            validate: (input: string) => {
              if (input.trim().length === 0) {
                return 'Please describe what you want us to build';
              }
              if (input.trim().length < 10) {
                return 'Please provide a more detailed description (at least 10 characters)';
              }
              return true;
            },
            transformer: (input: string) => input.trim(),
          },
        ]);

        output.debug(`User wants to build: ${appPrompt}`);

        let flowNamesData: AppSchema;
        let currentPrompt = appPrompt;
        let iteration = 0;

        // Loop for flow generation and refinement
        while (true) {
          // Generate flow names
          console.log();
          const flowSpinner = ora({
            text: chalk.gray(iteration === 0 ? 'Generating some flows...' : 'Regenerating flows with your feedback...'),
            spinner: 'dots'
          }).start();

          try {
            flowNamesData = await sendFlowCommand(currentPrompt, 'flow-names', (partialData) => {
              if (partialData.flows && Array.isArray(partialData.flows)) {
                flowSpinner.text = chalk.gray(`Generated ${partialData.flows.length} flows...`);
              }
            });
            flowSpinner.succeed(chalk.green('Flows generated successfully!'));
          } catch (error) {
            flowSpinner.fail(chalk.red('Failed to generate flows'));
            throw error;
          }

          if (!flowNamesData.flows || flowNamesData.flows.length === 0) {
            console.log(chalk.yellow('No flows were generated. Please try with a different prompt.'));
            return;
          }

          // Display flows using the new format
          console.log();
          const flowTextLines = convertToTextFormat(flowNamesData, 'flow-names');
          console.log(renderColoredText(flowTextLines));
          console.log();

          // Ask for confirmation or changes
          const { confirmation } = await inquirer.prompt([
            {
              type: 'input',
              name: 'confirmation',
              message: chalk.cyan('Is this on point or would you like to make changes?\n') + 
                      chalk.gray('  Press ') + chalk.green('Enter') + chalk.gray(', type ') + chalk.green('Yes') + chalk.gray(' or ') + chalk.green('Y') + 
                      chalk.gray(' to continue, or describe what changes you\'d like:'),
              transformer: (input: string) => input.trim(),
            },
          ]);

          // Check if user is satisfied
          if (confirmation === '' || confirmation.toLowerCase() === 'yes' || confirmation.toLowerCase() === 'y') {
            break;
          }

          // User wants changes - update the prompt
          const previousFlows = flowNamesData.flows.slice(0, 4).map(f => f.name).join(', ');
          currentPrompt = `Original request: ${appPrompt}\n\nPreviously generated flows: ${previousFlows}\n\nUser feedback: ${confirmation}\n\nPlease generate 4 new flows based on this feedback.`;
          iteration++;
        }

        // Step 3: Generate full specs with slices, client, and server details
        console.log();
        console.log(chalk.cyan('Building up your flows...'));
        console.log();

        const specSpinner = ora({
          text: chalk.gray('Generating full specifications...'),
          spinner: 'dots'
        }).start();

        try {
          const flowNames = flowNamesData.flows.map(f => f.name).join(', ');
          const specsPrompt = `Based on the application: ${appPrompt}

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
          
          let updateCount = 0;
          const specsData = await sendFlowCommand(specsPrompt, 'specs', (partialData) => {
            if (partialData.flows && Array.isArray(partialData.flows)) {
              // Stop spinner on first data
              if (specSpinner.isSpinning) {
                specSpinner.stop();
              }

              // Clear console and redraw everything
              console.clear();
              
              // Redraw the header
              console.log(chalk.cyan('Building up your flows...'));
              console.log();
              console.log(chalk.gray('Full specifications'));
              console.log(chalk.gray('─'.repeat(50)));
              
              // Render the current state with full specs
              const specTextLines = convertToTextFormat(partialData, 'specs');
              console.log(renderColoredText(specTextLines));
              
              // Debug: Log update count and check data structure
              updateCount++;
              const firstSlice = partialData.flows[0]?.slices?.[0];
              if (firstSlice) {
                output.debug(`Stream update ${updateCount}: ${JSON.stringify(firstSlice, null, 2)}`);
                // Also log server data specifically
                const serverData = firstSlice.specs?.server || firstSlice.server;
                if (serverData) {
                  output.debug(`Server data keys: ${Object.keys(serverData).join(', ')}`);
                  if (serverData.gwt) {
                    output.debug(`GWT structure: ${JSON.stringify(serverData.gwt, null, 2)}`);
                  }
                }
              }
            }
          });

          // Final success message
          console.log();
          console.log(chalk.green('✅ Complete flow structure generated!'));
          
        } catch (error) {
          if (specSpinner.isSpinning) {
            specSpinner.fail(chalk.red('Failed to generate specifications'));
          } else {
            console.log(chalk.red('\n❌ Failed to generate specifications'));
          }
          throw error;
        }

        console.log();
        console.log(chalk.gray('Next steps:'));
        console.log(chalk.gray('- Review the generated flow specifications'));
        console.log(chalk.gray('- Refine any slices or specifications as needed'));
        console.log(chalk.gray('- Generate the actual code implementation'));

        await analytics.trackCommand('start', true);
        output.debug('Start command completed successfully');

      } catch (error: unknown) {
        await analytics.trackCommand('start', false, error instanceof Error ? error.message : 'unknown');
        if (error instanceof Error) {
          handleError(error);
        } else {
          handleError(new Error(String(error)));
        }
      }
    });
}; 