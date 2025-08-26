#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

import { loadConfig, validateConfig } from './utils/config';
import { handleError } from './utils/errors';
import { createOutput, supportsColor } from './utils/terminal';
import { Analytics } from './utils/analytics';

import { createCreateExampleCommand } from './commands/create-example';
import { createCopyExampleCommand } from './commands/copy-example';
import { createExportSchemaCommand } from './commands/export-schema';
import { createGenerateServerCommand } from './commands/generate-server';
import { createGenerateGQLSchemaCommand } from './commands/generate-gql-schema';
import { createImplementServerCommand } from './commands/implement-server';
import { createImportDesignSystemCommand } from './commands/import-design-system';
import { createGenerateIACommand } from './commands/generate-ia';
import { createGenerateClientCommand } from './commands/generate-client';
import { createImplementClientCommand } from './commands/implement-client';
import { createCheckClientCommand } from './commands/check-client';
import { createCheckTypesCommand } from './commands/check-types';
import { createCheckTestsCommand } from './commands/check-tests';
import { createCheckLintCommand } from './commands/check-lint';

const VERSION = process.env.npm_package_version ?? '0.1.2';

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

const displayBanner = (config: ReturnType<typeof loadConfig>) => {
  if (config.output === 'text' && supportsColor(config) && process.stdout.isTTY) {
    const asciiText = figlet.textSync('AutoEngineer', { font: 'Slant' });
    console.log(chalk.bgBlack(gradient(['#F44B4B', '#FF9C1A', '#F9F871', '#4CD964', '#4BC6F4'])(asciiText)));
    console.log();
  }
};

const setupProgram = (config: ReturnType<typeof loadConfig>) => {
  const program = createCLI();
  const analytics = new Analytics(config);

  program.addCommand(createCreateExampleCommand(config, analytics));
  program.addCommand(createCopyExampleCommand(config, analytics));
  program.addCommand(createExportSchemaCommand(config, analytics));
  program.addCommand(createGenerateServerCommand(config, analytics));
  program.addCommand(createGenerateGQLSchemaCommand(config, analytics));
  program.addCommand(createImplementServerCommand(config, analytics));
  program.addCommand(createImportDesignSystemCommand(config, analytics));
  program.addCommand(createGenerateIACommand(config, analytics));
  program.addCommand(createGenerateClientCommand(config, analytics));
  program.addCommand(createImplementClientCommand(config, analytics));
  program.addCommand(createCheckClientCommand(config, analytics));
  program.addCommand(createCheckTypesCommand(config, analytics));
  program.addCommand(createCheckTestsCommand(config, analytics));
  program.addCommand(createCheckLintCommand(config, analytics));

  program.addHelpText(
    'after',
    `
Commands:

  ${chalk.cyan('🎯 Flow Development')}
  create:example <name>                                      Current options: ['shopping-assistant']
  export:schema <context> <flows>                            Export flow schemas to context directory

  ${chalk.cyan('⚙️ Backend Generation')}
  generate:server <schema> <dest>                            Generate server from schema.json
  implement:server <server-dir>                              AI implements server TODOs and tests

  ${chalk.cyan('🎨 Design System & Frontend')}
  import:design-system <src> <mode> [filter]                 Import Figma design system
  generate:ia <context> <flows...>                           Generate Information Architecture  
  generate:client <starter> <client> <ia> <gql> [vars]       Generate React client app
  implement:client <client> <context> <principles> <design>  AI implements client

  ${chalk.cyan('✅ Validation & Testing')}
  check:types <directory>                                    TypeScript type checking
  check:tests <directory>                                    Run Vitest test suites
  check:lint <directory> [--fix]                             ESLint with optional auto-fix
  check:client <client-dir>                                  Full frontend validation suite

Examples:

  ${chalk.gray('# Complete flow from scratch')}
  $ mkdir shopping-assistant && cd shopping-assistant
  $ auto create:example shopping-assistant
  $ cd shopping-assistant && pnpm install
  $ auto export:schema ./.context ./flows

  ${chalk.gray('# Generate and implement backend')}
  $ auto generate:server .context/schema.json .
  $ auto implement:server ./server
  $ auto check:types ./server
  $ auto check:tests ./server

  ${chalk.gray('# Import design system and generate frontend (Shadcn)')}
  $ auto import:design-system ./.context WITH_COMPONENT_SETS ./shadcn-filter.ts
  $ auto generate:ia ./.context ./flows/*.flow.ts
  $ auto generate:client ./shadcn-starter ./client ./auto-ia.json ./schema.graphql ./figma-vars.json
  $ auto implement:client ./client ./.context ./design-principles.md ./design-system.md
  
  ${chalk.gray('# Run validation checks')}
  $ auto check:types ./server --scope project
  $ auto check:tests ./server
  $ auto check:lint ./server --fix
  $ auto check:client ./client

Environment Variables:
  ${chalk.gray('AI Providers (need at least one):')}
  ANTHROPIC_API_KEY                      Anthropic Claude API key
  OPENAI_API_KEY                         OpenAI API key
  GEMINI_API_KEY                         Google Gemini API key
  XAI_API_KEY                            X.AI Grok API key

  ${chalk.gray('Debugging & Configuration:')}
  DEBUG=*                                Enable all debug output
  DEBUG=auto-engineer:*                  Enable auto-engineer debug only
  NO_COLOR=1                             Disable colored output
  AUTO_ENGINEER_ANALYTICS=false          Disable usage analytics

Tips:
  • Use DEBUG=* to troubleshoot command issues, then narrow the debug scope down to specific command(s)
  • Run 'pnpm install' after create:example
  • Ensure servers are running before check:client

For docs & support: https://github.com/SamHatoum/auto-engineer
    `,
  );

  return program;
};

const loadEnvFile = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
};

const initializeEnvironment = () => {
  checkNodeVersion();
  loadEnvFile();
  clearConsole();
  setupSignalHandlers();
};

const handleProgramError = (error: unknown) => {
  if (
    error instanceof Error &&
    (error.message.includes('commander') ||
      error.message.includes('helpDisplayed') ||
      error.message.includes('version'))
  ) {
    process.exit(0);
  }

  if (error instanceof Error) {
    handleError(error);
  } else {
    console.error(chalk.red('Unknown error:'), error);
    process.exit(1);
  }
};

const main = async () => {
  try {
    initializeEnvironment();

    const program = createCLI();
    program.parse(process.argv, { from: 'user' });
    const globalOptions = program.opts();

    const config = loadConfig({
      debug: Boolean(globalOptions.debug),
      noColor: Boolean(globalOptions.noColor),
      output: globalOptions.json === true ? 'json' : 'text',
      apiToken: typeof globalOptions.apiToken === 'string' ? globalOptions.apiToken : undefined,
      projectPath: typeof globalOptions.projectPath === 'string' ? globalOptions.projectPath : undefined,
    });

    validateConfig(config);
    createOutput(config);
    displayBanner(config);

    const fullProgram = setupProgram(config);
    await fullProgram.parseAsync(process.argv);
  } catch (error: unknown) {
    handleProgramError(error);
  }
};

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(chalk.red('Fatal error:'), errorMessage);
  process.exit(1);
});
