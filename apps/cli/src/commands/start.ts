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

// Color constants
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
    if (/^#\s*\*\*?Flow[:]?.*/i.test(line)) {
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
          const spinnerColors = [COLORS.EVENTS, COLORS.COMMANDS, COLORS.STATE, COLORS.CLIENT_SERVER, COLORS.STREAM_BRACKETS, COLORS.INTEGRATIONS_BRACKETS];
          const coloredFrames = spinnerFrames.map((frame, i) => {
            const color = spinnerColors[i % spinnerColors.length];
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
          await new Promise(resolve => setTimeout(resolve, 100));
          spinner.stop();

          console.log();

          const buildSummaryLines = [
            '# **Flow: Guest books a listing** [source: <root>/src/flows/guest-booking-flow.ts]',
            '* **Slice:** Search for available listings [stream: listing]',
            '  * **Client:** Listing Search Screen',
            '      should have location filter',
            '      should have price range slider',
            '      should have guest count filter',
            '  * **Server:** Search listings by location and price',
            '      Events.ListingCreated => State.AvailableListings',
            '',
            '* **Slice:** Book listing [stream: booking]',
            '  * **Client:** Booking Form',
            '      should have check-in & checkout date picker',
            '      should have guest count selector',
            '  * **Server:** Process booking request',
            '      Commands.BookListing => Events.BookingConfirmed',
            '',
            '* **Slice:** Host is notified',
            '  * **Server:** Host is notified when booking request is received',
            '      Events.BookingConfirmed => Commands.NotifyHost',
            '',
            '* **Slice:** Notify host [integrations: MailChimp, Twilio]',
            '  * **Server:** Send notification using the specified integrations',
            '      Commands.NotifyHost => Events.HostNotified',
            '',
            '⏱️ Time: ~2-3 min | 💰 Cost: ~$2',
          ];
          console.log(renderFlowSummary(buildSummaryLines));

          console.log(); // Add blank line

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