#!/usr/bin/env node
import '@auto-engineer/config';

import { Command } from 'commander';
import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';

import { loadConfig, validateConfig } from './utils/config.js';
import { handleError } from './utils/errors.js';
import { createOutput, supportsColor } from './utils/terminal.js';
import { Analytics } from './utils/analytics.js';

import { createInitCommand } from './commands/init.js';
import { createDemoCommand } from './commands/demo.js';
import { createStartCommand } from './commands/start.js';

const VERSION = process.env.npm_package_version || '0.1.2';

const checkNodeVersion = () => {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 18) {
    console.error(chalk.red(`Error: Node.js version ${nodeVersion} is not supported.`));
    console.error(chalk.yellow('Auto-engineer requires Node.js 18.0.0 or higher.'));
    console.error(chalk.blue('Please upgrade Node.js and try again.'));
    process.exit(1);
  }
};

const clearConsole = () => {
  if (process.stdout.isTTY) {
    // Clear console for TTY environments
    process.stdout.write('\x1Bc');
  }
};

const setupSignalHandlers = () => {
  process.on('SIGINT', () => {
    console.log('\n' + chalk.yellow('Operation cancelled by user'));
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n' + chalk.yellow('Process terminated'));
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught Exception:'), error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    process.exit(1);
  });
};

const createCLI = () => {
  const program = new Command();

  program
    .name('auto-engineer')
    .description('Auto Engineer - Build production ready full-stack apps with AI')
    .version(VERSION, '-v, --version')
    .option('-d, --debug', 'Enable debug mode')
    .option('--no-color', 'Disable colored output')
    .option('--json', 'Output in JSON format')
    .option('--api-token <token>', 'API token for external services') 
    .option('--project-path <path>', 'Project path to work with');

  return program;
};

const main = async () => {
  try {
    checkNodeVersion();

    clearConsole();

    setupSignalHandlers();

    const program = createCLI();

    program.parse(process.argv, { from: 'user' });
    const globalOptions = program.opts();

    const config = loadConfig({
      debug: globalOptions.debug || false,
      noColor: globalOptions.noColor || false,
      output: globalOptions.json ? 'json' : 'text',
      apiToken: globalOptions.apiToken,
      projectPath: globalOptions.projectPath,
    });

    validateConfig(config);

    const output = createOutput(config);

    if (config.output === 'text' && supportsColor(config) && process.stdout.isTTY) {
      const asciiText = figlet.textSync('AutoEngineer', { font: 'Slant' });
      console.log(chalk.bgBlack(gradient([
        '#F44B4B',
        '#FF9C1A',
        '#F9F871',
        '#4CD964',
        '#4BC6F4' 
      ])(asciiText)));
      console.log(chalk.gray(`Version ${VERSION}\n`));
    }

    const analytics = new Analytics(config);

    program.addCommand(createInitCommand(config, analytics));
    program.addCommand(createDemoCommand(config, analytics));
    program.addCommand(createStartCommand(config, analytics));

    program.addHelpText('after', `
Examples:
  $ auto-engineer start                   Create flows interactively using AI
  $ ag start                              Create flows interactively using AI (short alias)
  $ auto-engineer demo                    Start demo mode
  $ auto-engineer init                    Initialize configuration
  $ auto-engineer generate --type code    Generate code templates
  $ auto-engineer analyze --format json   Analyze code in JSON format
  $ echo "code" | auto-engineer analyze   Analyze content from STDIN

Environment Variables:
  DEBUG=auto-engineer                     Enable debug mode
  NO_COLOR=1                              Disable colored output
  OUTPUT_FORMAT=json                      Set output format
  AUTO_ENGINEER_API_TOKEN=<token>         Set API token
  AUTO_ENGINEER_ANALYTICS=false           Disable analytics (enabled by default)

For more information, visit: https://github.com/SamHatoum/auto-engineer
    `);

    await program.parseAsync(process.argv);

  } catch (error: unknown) {
    if (error instanceof Error && (
      error.message.includes('commander') ||
      error.message.includes('helpDisplayed') ||
      error.message.includes('version')
    )) {
      process.exit(0);
    }

    if (error instanceof Error) {
      handleError(error);
    } else {
      console.error(chalk.red('Unknown error:'), error);
      process.exit(1);
    }
  }
};

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(chalk.red('Fatal error:'), errorMessage);
  process.exit(1);
}); 