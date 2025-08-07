import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
  renderer: new (markedTerminal as any)({
    heading: chalk.hex('#00BFFF').bold, // h1
    firstHeading: chalk.hex('#00BFFF').bold, // h1
    strong: chalk.bold,
    em: chalk.italic,
    listitem: chalk.hex('#90EE90'), // bullets
    codespan: chalk.yellow,
  }),
});

export const createDemoCommand = (config: Config, analytics: Analytics) => {
  const output = createOutput(config);

  return new Command('demo').description('Start demo mode to build something').action(async () => {
    try {
      output.debug('Demo command initiated');

      while (true) {
        const { buildPrompt } = await inquirer.prompt<{ buildPrompt: string }>([
          {
            type: 'input',
            name: 'buildPrompt',
            message: 'What would you like to build?',
            validate: (input: string) => {
              if (input.trim().length === 0) {
                return "Please enter something you'd like to build";
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
        const spinnerColors = [
          COLORS.EVENTS,
          COLORS.COMMANDS,
          COLORS.STATE,
          COLORS.CLIENT_SERVER,
          COLORS.STREAM_BRACKETS,
          COLORS.INTEGRATIONS_BRACKETS,
        ];
        const coloredFrames = spinnerFrames.map((frame, i) => {
          const color = spinnerColors[i % spinnerColors.length];
          return color(frame);
        });

        const spinner = ora({
          text: chalk.gray('Thinking...'),
          spinner: {
            interval: 80,
            frames: coloredFrames,
          },
        }).start();

        // Simulate thinking time
        await new Promise((resolve) => setTimeout(resolve, 100));
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
        console.log(buildSummaryLines.join('\\n'));

        console.log(); // Add blank line

        const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
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
            frames: coloredFrames,
          },
        }).start();

        await new Promise((resolve) => setTimeout(resolve, 2000));
        spinner2.stop();

        // Show deployment success message
        console.log(chalk.green('✅ Your app has been deployed!'));
        console.log(chalk.cyan('🌐 Access it at: http://localhost:3000'));

        const { action } = await inquirer.prompt<{ action: string }>([
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

      await analytics.trackCommand('demo', true);

      output.debug('Demo command completed successfully');
    } catch (error: unknown) {
      await analytics.trackCommand('demo', false, error instanceof Error ? error.message : 'unknown');
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(new Error(String(error)));
      }
    }
  });
};
