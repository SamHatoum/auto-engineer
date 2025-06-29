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

// Color constants matching start.ts
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

// Initialize message bus
const messageBus = new MessageBus();
messageBus.registerCommandHandler(createFlowCommandHandler);

function formatFlowName(flowName: string): string {
  // Color Events, Commands, State in flow names
  let formatted = flowName;
  formatted = formatted.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
  formatted = formatted.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
  formatted = formatted.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
  return COLORS.FLOW_TEXT(formatted);
}

function formatSliceName(sliceName: string, sliceType?: string): string {
  let formatted = sliceName;
  formatted = formatted.replace(/\bEvents?\.\w+/gi, match => COLORS.EVENTS(match));
  formatted = formatted.replace(/\bCommands?\.\w+/gi, match => COLORS.COMMANDS(match));
  formatted = formatted.replace(/\bStates?\.\w+/gi, match => COLORS.STATE(match));
  
  const typeLabel = sliceType ? chalk.gray(` [${sliceType}]`) : '';
  return COLORS.SLICE_TEXT(formatted) + typeLabel;
}

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
            message: 'What kind of app would you like to build?',
            validate: (input: string) => {
              if (input.trim().length === 0) {
                return 'Please describe the app you want to build';
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

        // Step 2: Generate flow names
        console.log();
        const flowSpinner = ora({
          text: chalk.gray('Generating flows...'),
          spinner: 'dots'
        }).start();

        let flowNamesData: AppSchema;
        try {
          flowNamesData = await sendFlowCommand(appPrompt, 'flow-names', (partialData) => {
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

        // Step 3: Display flows and let user select one
        console.log();
        console.log(chalk.cyan('Generated Flows:'));
        console.log(chalk.gray('─'.repeat(50)));
        
        const flowChoices = flowNamesData.flows.map((flow, index) => {
          console.log(`${chalk.gray(`${index + 1}.`)} ${formatFlowName(flow.name)}`);
          if (flow.description) {
            console.log(`   ${chalk.gray(flow.description)}`);
          }
          console.log();
          
          return {
            name: flow.name,
            value: index,
            short: flow.name
          };
        });

        // Add "Build it all" option
        flowChoices.push({
          name: chalk.yellow.bold('📦 Build it all (Spec the whole thing)'),
          value: -1,  // Special value to indicate "build all"
          short: 'Build it all'
        });

        const { selectedFlowIndex } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedFlowIndex',
            message: 'Select a flow to expand with slices:',
            choices: flowChoices,
            pageSize: 10
          }
        ]);

        // Handle "Build it all" selection
        if (selectedFlowIndex === -1) {
          console.log();
          console.log(chalk.cyan('Building complete specifications for all flows...'));
          
          const specSpinner = ora({
            text: chalk.gray('Generating specifications...'),
            spinner: 'dots'
          }).start();

          try {
            const specsData = await sendFlowCommand(appPrompt, 'specs', (partialData) => {
              if (partialData.flows && Array.isArray(partialData.flows)) {
                const totalSlices = partialData.flows.reduce((acc: number, flow: any) => {
                  return acc + (flow.slices?.length || 0);
                }, 0);
                specSpinner.text = chalk.gray(`Generating specifications... (${totalSlices} slices)`);
              }
            });
            
            specSpinner.succeed(chalk.green('Specifications generated successfully!'));
            
            // Display generated specs summary
            console.log();
            console.log(chalk.cyan('Generated Specifications:'));
            console.log(chalk.gray('─'.repeat(50)));
            
            if (specsData.flows && Array.isArray(specsData.flows)) {
              specsData.flows.forEach((flow: any) => {
                console.log(`\n${formatFlowName(flow.name)}`);
                if (flow.slices && Array.isArray(flow.slices)) {
                  flow.slices.forEach((slice: any, idx: number) => {
                    console.log(`  ${chalk.gray(`${idx + 1}.`)} ${formatSliceName(slice.name, slice.type)}`);
                    if (slice.specs) {
                      console.log(`     ${COLORS.SPECS_LABEL('Specs:')} ${COLORS.SPECS_TEXT(Object.keys(slice.specs).join(', '))}`);
                    }
                  });
                }
              });
            }

            console.log();
            console.log(chalk.green('✅ Complete specifications generated successfully!'));
            console.log(chalk.gray('\nNext steps:'));
            console.log(chalk.gray('- Review the generated specifications'));
            console.log(chalk.gray('- Generate the actual code implementation'));
            console.log(chalk.gray('- Run tests to verify the implementation'));
            
            await analytics.trackCommand('start', true);
            output.debug('Start command completed successfully with full specs');
            return;
            
          } catch (error) {
            specSpinner.fail(chalk.red('Failed to generate specifications'));
            throw error;
          }
        }

        const selectedFlow = flowNamesData.flows[selectedFlowIndex];
        console.log();
        console.log(chalk.cyan(`Selected flow: ${formatFlowName(selectedFlow.name)}`));

        // Step 4: Generate slices for the selected flow
        console.log();
        const sliceSpinner = ora({
          text: chalk.gray('Generating slices...'),
          spinner: 'dots'
        }).start();

        let sliceNamesData: AppSchema;
        try {
          const slicePrompt = `For the flow "${selectedFlow.name}", generate detailed slices. ${selectedFlow.description || ''}`;
          sliceNamesData = await sendFlowCommand(slicePrompt, 'slice-names', (partialData) => {
            if (partialData.flows?.[0]?.slices && Array.isArray(partialData.flows[0].slices)) {
              sliceSpinner.text = chalk.gray(`Generated ${partialData.flows[0].slices.length} slices...`);
            }
          });
          sliceSpinner.succeed(chalk.green('Slices generated successfully!'));
        } catch (error) {
          sliceSpinner.fail(chalk.red('Failed to generate slices'));
          throw error;
        }

        // Step 5: Display the generated slices
        console.log();
        console.log(chalk.cyan('Generated Slices:'));
        console.log(chalk.gray('─'.repeat(50)));

        const flowWithSlices = sliceNamesData.flows?.[0];
        if (flowWithSlices && 'slices' in flowWithSlices && Array.isArray(flowWithSlices.slices)) {
          flowWithSlices.slices.forEach((slice: any, index: number) => {
            if (slice && typeof slice === 'object' && 'name' in slice && 'type' in slice) {
              console.log(`${chalk.gray(`${index + 1}.`)} ${formatSliceName(slice.name, slice.type)}`);
              if ('description' in slice && slice.description) {
                console.log(`   ${chalk.gray(slice.description)}`);
              }
            }
          });
        }

        console.log();
        console.log(chalk.green('✅ Flow structure created successfully!'));
        console.log(chalk.gray('\nNext steps:'));
        console.log(chalk.gray('- Continue to add client/server details'));
        console.log(chalk.gray('- Generate specifications for each slice'));
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