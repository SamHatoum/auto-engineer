import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { Config } from '../utils/config.js';
import { createOutput } from '../utils/terminal.js';
import { handleError } from '../utils/errors.js';
import { Analytics } from '../utils/analytics.js';
import markedTerminal from 'marked-terminal';
import { marked } from 'marked';

// Rainbow gradient colors matching the image: red, orange, yellow, green, cyan, blue
const GRADIENT_COLORS = [
  chalk.hex('#FF4136'), // red
  chalk.hex('#FF851B'), // orange
  chalk.hex('#FFDC00'), // yellow
  chalk.hex('#2ECC40'), // green
  chalk.hex('#7FDBFF'), // cyan
  chalk.hex('#0074D9'), // blue
];

// Configure marked to use marked-terminal with custom styles
marked.setOptions({
  renderer: new (markedTerminal as any)({
    heading: chalk.hex('#00BFFF').bold,         // h1
    firstHeading: chalk.hex('#00BFFF').bold,    // h1
    strong: chalk.bold,
    em: chalk.italic,
    listitem: chalk.hex('#90EE90'),             // bullets
    codespan: chalk.yellow,
  }) as any
});

function renderFlowSummary(lines: string[]): string {
  return lines.map(line => {
    if (/^#\s*\*\*?Flow[:]?.*/i.test(line)) {
      return chalk.bold.blue(line.replace(/^#\s*/, '').replace(/\*\*/g, ''));
    }
    if (/^\*\s*\*\*?Slice[:]?.*/i.test(line)) {
      return chalk.green('  ' + line.replace(/^\*\s*/, '').replace(/\*\*/g, ''));
    }
    if (/^\s*\*\s*\*\*?Client[:]?.*/i.test(line)) {
      return chalk.cyan('    ' + line.trim().replace(/^\*\s*/, '').replace(/\*\*/g, ''));
    }
    if (/^\s*\*\s*\*\*?Server[:]?.*/i.test(line)) {
      return chalk.cyan('    ' + line.trim().replace(/^\*\s*/, '').replace(/\*\*/g, ''));
    }
    if (/^\s*\*\s*\*\*?Via[:]?.*/i.test(line)) {
      return chalk.magenta('    ' + line.trim().replace(/^\*\s*/, '').replace(/\*\*/g, ''));
    }
    if (/^\s*[-*]\s*_?Specs:?_?/i.test(line)) {
      return chalk.gray('      ' + line.replace(/^\s*[-*]\s*/, '').replace(/_|\*/g, ''));
    }
    if (/Time:|Cost:/i.test(line)) {
      return chalk.yellow(line);
    }
    return line;
  }).join('\n');
}

export const createStartCommand = (config: Config, analytics: Analytics) => {
  const output = createOutput(config);
  
  return new Command('start')
    .description('Start interactive mode to build something')
    .action(async () => {
      try {
        output.debug('Start command initiated');
        
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { buildPrompt } = await inquirer.prompt([
            {
              type: 'input',
              name: 'buildPrompt',
              message: 'What would you like to build?',
              validate: (input: string) => {
                if (input.trim().length === 0) {
                  return 'Please enter something you\'d like to build';
                }
                if (input.trim().length < 3) {
                  return 'Please provide a more detailed description (at least 3 characters)';
                }
                return true;
              },
              transformer: (input: string) => input.trim(),
            },
          ]);
          
          output.debug(`User wants to build: ${buildPrompt}`);
                
          const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
          const coloredFrames = spinnerFrames.map((frame, i) => {
            const color = GRADIENT_COLORS[i % GRADIENT_COLORS.length];
            return color(frame);
          });

          const spinner = ora({
            text: chalk.gray('Thinking...'),
            spinner: {
              interval: 80,
              frames: coloredFrames
            }
          }).start();
          
          // Simulate thinking time
          await new Promise(resolve => setTimeout(resolve, 1000));
          spinner.stop();
          
          const buildSummaryLines = [
            '# **Flow: Host creates a listing**',
            '* **Slice:** Create listing [Stream: listing-${id}]',
            '  * **Client:** A form that allows hosts to create a listing',
            '  * **Server:** Host can create a new listing',
            '    * _Specs:_ When Commands.CreateListing => Then Events.ListingCreated',
            '',
            '# **Flow: Guest books a listing**',
            '* **Slice:** Search for available listings',
            '  * **Client:** Listing Search Screen',
            '  * **Server:** Listing becomes searchable after being created',
            '    * _Specs:_ When Events.ListingCreated => Then State.AvailableListings',
            '* **Slice:** Host is notified',
            '  * **Server:** Host is notified when booking request is received',
            '    * _Specs:_ When Events.BookingRequested => Then Commands.NotifyHost',
            '* **Slice:** Notify host',
            '  * **Via:** MailChimp, Twilio',
            '  * **Server:** Send notification using the specified integrations',
            '    * _Specs:_ When Commands.NotifyHost => Then Events.HostNotified',
            '',
            '⏱️  Time: ~2-3 min | 💰 Cost: ~$4',
          ];
          console.log(renderFlowSummary(buildSummaryLines));

          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Do you want to proceed?',
            },
          ]);

          if (!confirm) {
            console.log(chalk.yellow('Going back to build prompt...'));
            continue;
          }

          // Second thinking phase
          const spinner2 = ora({
            text: chalk.gray('Building...'),
            spinner: {
              interval: 80,
              frames: coloredFrames
            }
          }).start();
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          spinner2.stop();

          // Show deployment success message
          console.log(chalk.green('✅ Your app has been deployed!'));
          console.log(chalk.cyan('🌐 Access it at: http://localhost:3000'));

          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What would you like to do?',
              choices: ['Accept', 'Reject', 'Retry'],
            },
          ]);

          if (action === 'Accept') {
            console.log(chalk.green('Build accepted!'));
            // Continue the loop to ask for help again
          } else if (action === 'Reject') {
            console.log(chalk.red('Build rejected.'));
            // Continue the loop to ask for help again
          } else if (action === 'Retry') {
            console.log(chalk.blue('Retrying...'));
            // Continue the loop to ask for help again
          }
        }

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