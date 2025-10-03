#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import Debug from 'debug';

import { loadConfig, validateConfig } from './utils/config';
import { handleError } from './utils/errors';
import { createOutput } from './utils/terminal';
import { Analytics } from './utils/analytics';
import { PluginLoader } from './plugin-loader';
import getPort, { portNumbers } from 'get-port';

// Export DSL functions for use in auto.config.ts
export { on, dispatch, fold, autoConfig } from './dsl/index';

const debug = Debug('auto-engineer:cli');

// Get version from package.json - works in both dev and production
const getVersion = (): string => {
  try {
    // Try to read from package.json relative to this file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Try multiple possible locations for package.json
    // In dev: src/index.ts -> ../package.json
    // In dist: dist/src/index.js -> ../../package.json
    const possiblePaths = [
      path.join(__dirname, '..', 'package.json'), // dev environment
      path.join(__dirname, '..', '..', 'package.json'), // dist build
    ];

    for (const packageJsonPath of possiblePaths) {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version: string };
        return packageJson.version;
      }
    }
  } catch {
    // Fall through to env variable
  }

  // Fallback to npm_package_version (works when run via npm scripts)
  // If neither works, show unknown
  return process.env.npm_package_version ?? 'unknown';
};

const VERSION = getVersion();

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

const setupSignalHandlers = () => {
  process.on('SIGINT', () => {
    if (serverInstance !== null && serverInstance !== undefined) {
      console.log('\n' + chalk.yellow('Shutting down server...'));
      try {
        void serverInstance.stop();
      } catch (error) {
        console.error('Error stopping server:', error);
      }
    } else {
      console.log('\n' + chalk.yellow('Operation cancelled by user'));
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (serverInstance !== null && serverInstance !== undefined) {
      console.log('\n' + chalk.yellow('Shutting down server...'));
      try {
        void serverInstance.stop();
      } catch (error) {
        console.error('Error stopping server:', error);
      }
    } else {
      console.log('\n' + chalk.yellow('Process terminated'));
    }
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
    .option('--project-path <path>', 'Project path to work with')
    .option('--host <url>', 'Message bus server URL (e.g., localhost:5555)');

  return program;
};

// Type-safe command data mappers
type CommandData = Record<string, unknown>;

const prepareCommandData = (
  alias: string,
  args: (string | string[])[],
  options: Record<string, unknown>,
  pluginLoader: PluginLoader,
): CommandData => {
  const mapper = pluginLoader.getCommandMapper(alias);
  if (mapper !== undefined) {
    return mapper(args, options);
  }

  // Default handling for unknown commands
  const baseData: CommandData = {};
  args.forEach((arg, index) => {
    if (arg !== '') {
      baseData[`arg${index + 1}`] = arg;
    }
  });

  Object.keys(options).forEach((key) => {
    if (options[key] !== undefined && key !== '_') {
      baseData[key] = options[key];
    }
  });

  return baseData;
};

interface CommanderCommand {
  opts: () => Record<string, unknown>;
  parent?: CommanderCommand;
}

const filterNonEmptyArgs = (args: unknown[]): (string | string[])[] => {
  return args.filter((arg) => {
    if (typeof arg === 'string') return arg !== '';
    if (Array.isArray(arg)) return true;
    return false;
  }) as (string | string[])[];
};

const debugCommandExecution = (args: unknown[], cmdArgs: unknown[], options: Record<string, unknown>): void => {
  if (process.env.DEBUG !== undefined && process.env.DEBUG.includes('cli:')) {
    console.error('DEBUG cli: Raw args:', args);
    console.error('DEBUG cli: Command args:', cmdArgs);
    console.error('DEBUG cli: Options:', options);
  }
};

const debugCommandData = (commandData: CommandData): void => {
  if (process.env.DEBUG !== undefined && process.env.DEBUG.includes('cli:')) {
    console.error('DEBUG cli: Prepared command data:', commandData);
  }
};

const handleVersionOption = (
  options: Record<string, unknown>,
  alias: string,
  loadedCommands: Map<string, LoadedCommand>,
): boolean => {
  if (options.version === true) {
    const commandInfo = loadedCommands.get(alias);
    const version =
      commandInfo && 'version' in commandInfo && typeof commandInfo.version === 'string'
        ? commandInfo.version
        : 'unknown';
    console.log(version);
    return true;
  }
  return false;
};

const executeCommandAction = async (
  args: unknown[],
  alias: string,
  pluginLoader: PluginLoader,
  loadedCommands: Map<string, LoadedCommand>,
  config: ReturnType<typeof loadConfig>,
  analytics: Analytics,
): Promise<void> => {
  const cmdObject = args[args.length - 1] as CommanderCommand;
  const cmdArgs = args.slice(0, -1);

  const options: Record<string, unknown> = cmdObject.opts();

  const globalOpts = cmdObject.parent?.opts();
  const hostOption = globalOpts?.host as string | undefined;

  if (handleVersionOption(options, alias, loadedCommands)) {
    return;
  }

  await analytics.track({ command: alias, success: true });

  debugCommandExecution(args, cmdArgs, options);

  const nonEmptyArgs = filterNonEmptyArgs(cmdArgs);
  const commandData = prepareCommandData(alias, nonEmptyArgs, options, pluginLoader);

  debugCommandData(commandData);

  if (hostOption !== undefined) {
    pluginLoader.setHost(hostOption);
  }

  await pluginLoader.executeCommand(alias, commandData);

  if (hostOption !== undefined) {
    pluginLoader.setHost(config.host);
  }

  await analytics.track({ command: alias, success: true });
};

interface LoadedCommand {
  handler?: unknown;
  description: string;
  version?: string;
  usage?: string;
  examples?: string[];
  args?: Array<{ name: string; description: string; required?: boolean }>;
  options?: Array<{ name: string; description: string }>;
  category?: string;
}

const setupProgram = async (config: ReturnType<typeof loadConfig>) => {
  const program = createCLI();
  const analytics = new Analytics(config);
  const output = createOutput(config);
  const loadedCommands = new Map<string, LoadedCommand>();

  // Configure help to be minimal since we add our own
  program.configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name(),
    // Hide the Commands section
    formatHelp: (cmd, helper) => {
      const termWidth = helper.padWidth(cmd, helper);
      const helpWidth = helper.helpWidth ?? 80;
      const itemIndentWidth = 2;
      const itemSeparatorWidth = 2;

      function formatItem(term: string, description: string) {
        if (description !== '') {
          const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
          return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
        }
        return term;
      }

      function formatList(textArray: string[]) {
        return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
      }

      const output: string[] = [];

      // Usage
      const commandUsage = helper.commandUsage(cmd);
      output.push('Usage: ' + commandUsage, '');

      // Description
      const commandDescription = helper.commandDescription(cmd);
      if (commandDescription !== '') {
        output.push(commandDescription, '');
      }

      // Options
      const optionList = helper.visibleOptions(cmd).map((option) => {
        return formatItem(helper.optionTerm(option), helper.optionDescription(option));
      });
      if (optionList.length > 0) {
        output.push('Options:', formatList(optionList), '');
      }

      // Skip the Commands section - we'll add our own

      return output.join('\n');
    },
  });

  // Check for auto.config.ts or auto.config.js file
  let configPath = path.resolve(process.cwd(), 'auto.config.ts');
  let hasPluginConfig = fs.existsSync(configPath);

  if (!hasPluginConfig) {
    configPath = path.resolve(process.cwd(), 'auto.config.js');
    hasPluginConfig = fs.existsSync(configPath);
  }

  if (!hasPluginConfig) {
    output.error('No auto.config.ts or auto.config.js found. Please create one with your required plugins.');
    output.info('Example auto.config.js:');
    console.log(`
export default {
  plugins: [
    '@auto-engineer/flow',
    '@auto-engineer/server-generator-apollo-emmett',
    '@auto-engineer/server-implementer',
    // Add more plugins as needed
  ]
};`);
    process.exit(1);
  }

  // Use plugin system
  debug('Loading plugins from %s', configPath);

  try {
    const pluginLoader = new PluginLoader(config.host);
    const commands = await pluginLoader.loadPlugins(configPath);

    // Store loaded commands for dynamic help generation
    commands.forEach((command, alias) => {
      loadedCommands.set(alias, command);
    });

    // Register CLI commands that will dispatch through the message bus
    for (const [alias, command] of commands.entries()) {
      // Parse the command alias to get parts for commander
      const parts = alias.split(':');
      const primaryCommand = parts[0];
      const subCommand = parts.slice(1).join(':');

      let cmd: Command;
      if (subCommand) {
        // Create as subcommand (e.g., "create:example" becomes "create example")
        cmd = new Command(`${primaryCommand}:${subCommand}`);
      } else {
        // Single command
        cmd = new Command(primaryCommand);
      }

      cmd.description(command.description);

      // Add arguments from the command manifest
      if (command.args) {
        command.args.forEach((arg) => {
          // Handle variadic arguments (e.g., flows...)
          const isVariadic = arg.name.endsWith('...');
          const argName = isVariadic ? arg.name : arg.name;
          const argString = arg.required === true ? `<${argName}>` : `[${argName}]`;
          cmd.argument(argString, arg.description ?? '');
        });
      }

      // Add options from the command manifest
      if (command.options) {
        command.options.forEach((opt) => {
          cmd.option(opt.name, opt.description ?? '');
        });
      }

      // Add version option to each command if package has version
      const commandInfo = loadedCommands.get(alias);
      if (commandInfo && 'version' in commandInfo) {
        cmd.option('--version', 'Display version of the package providing this command');
      }

      cmd.action(async (...args: unknown[]) => {
        try {
          await executeCommandAction(args, alias, pluginLoader, loadedCommands, config, analytics);
        } catch (error) {
          await analytics.track({ command: alias, success: false });
          if (error instanceof Error) {
            handleError(error);
          } else {
            handleError(new Error(String(error)));
          }
        }
      });
      program.addCommand(cmd);
    }

    const pluginCount = pluginLoader.getLoadedPluginCount();
    debug('Loaded %d commands from %d plugins', commands.size, pluginCount);
  } catch (error) {
    output.error('Failed to load plugins');
    console.error(error);
    process.exit(1);
  }

  // Generate dynamic help text from loaded commands
  const generateDynamicHelp = () => {
    const categories = new Map<string, Array<{ alias: string; command: LoadedCommand }>>();

    // Group commands by category
    loadedCommands.forEach((command, alias) => {
      const category = command.category ?? 'Other Commands';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push({ alias, command });
    });

    const helpText: string[] = [];
    helpText.push('\nCommands:\n');

    // Build help text for each category
    categories.forEach((commands, category) => {
      helpText.push(`\n  ${chalk.cyan(category)}\n`);

      commands.forEach(({ alias, command }) => {
        const usage = command.usage ?? alias;
        const description = command.description ?? 'No description available';

        // Calculate padding for alignment
        const padding = ' '.repeat(Math.max(0, 60 - usage.length));
        helpText.push(`    ${usage}${padding}${description}\n`);

        // Add examples indented under the command
        if (command.examples && command.examples.length > 0) {
          command.examples.forEach((example) => {
            helpText.push(`      ${chalk.gray(example)}\n`);
          });
        }
      });
    });

    // Add environment variables section
    helpText.push(`
\nEnvironment Variables:
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
  • Use DEBUG=* to troubleshoot command issues
  • Run 'pnpm install' after create:example
  • Commands available depend on plugins in auto.config.ts

For docs & support: https://github.com/SamHatoum/auto-engineer\n`);

    return helpText.join('');
  };

  program.addHelpText('after', generateDynamicHelp());

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

let serverStarted = false;
let serverInstance: { stop: () => Promise<void> } | null = null;

const startMessageBusServer = async (): Promise<void> => {
  if (serverStarted) return;
  else serverStarted = true;

  const { MessageBusServer } = await import('./server/server');
  const { loadMessageBusConfig } = await import('./server/config-loader');

  debug('Starting Auto Engineer Server...');

  const server = new MessageBusServer({
    port: await getPort({ port: portNumbers(5555, 6000) }),
    enableFileSync: true,
    fileSyncDir: process.cwd(),
    fileSyncExtensions: ['.js', '.ts', '.tsx', '.jsx', '.html', '.css', 'auto.config'],
  });

  const configPath = path.resolve(process.cwd(), 'auto.config.ts');
  if (fs.existsSync(configPath)) {
    await loadMessageBusConfig(configPath, server);
  }
  serverInstance = server;
  await server.start();
};

// TODO make this check for the latest version and make it easy for devs to upgrade
const main = async () => {
  try {
    initializeEnvironment();

    // For help/version, we need to load the config with defaults to show all commands
    const hostArgIndex = process.argv.indexOf('--host');
    const hostValue =
      hostArgIndex !== -1 && hostArgIndex + 1 < process.argv.length ? process.argv[hostArgIndex + 1] : undefined;

    const config = loadConfig({
      debug: process.argv.includes('-d') || process.argv.includes('--debug'),
      noColor: process.argv.includes('--no-color'),
      output: process.argv.includes('--json') ? 'json' : 'text',
      host: hostValue,
    });

    validateConfig(config);
    createOutput(config);

    // Check if no command arguments provided (just 'auto')
    if (process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === 'serve')) {
      await startMessageBusServer();
      return;
    }

    const fullProgram = await setupProgram(config);
    await fullProgram.parseAsync(process.argv);
  } catch (error: unknown) {
    handleProgramError(error);
  }
};

// Only run main() if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('Fatal error:'), errorMessage);
    process.exit(1);
  });
}
