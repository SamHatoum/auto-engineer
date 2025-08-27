#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

import { loadConfig, validateConfig } from './utils/config';
import { handleError } from './utils/errors';
import { createOutput } from './utils/terminal';
import { Analytics } from './utils/analytics';
import { PluginLoader } from './plugin-loader';

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

// Type-safe command data mappers
type CommandData = Record<string, unknown>;

const commandMappers: Record<string, (args: string[], options: Record<string, unknown>) => CommandData> = {
  'create:example': (args) => ({ name: args[0] }),
  'export:schema': (args) => ({ contextDir: args[0], flowsDir: args[1] }),
  'generate:server': (args) => ({ schemaPath: args[0], destination: args[1] }),
  'implement:server': (args) => ({ serverDirectory: args[0] }),
  'implement:slice': (args) => ({ serverDir: args[0], sliceName: args[1] }),
  'generate:client': (args) => ({
    starterDir: args[0],
    targetDir: args[1],
    iaSchemaPath: args[2],
    gqlSchemaPath: args[3],
    figmaVariablesPath: args[4],
  }),
  'implement:client': (args) => ({
    projectDir: args[0],
    iaSchemeDir: args[1],
    designSystemPath: args[3] ?? args[2],
  }),
  'check:types': (args, options) => ({
    targetDirectory: args[0],
    fix: options.fix ?? false,
    scope: options.scope,
  }),
  'check:tests': (args, options) => ({
    targetDirectory: args[0],
    scope: options.scope,
  }),
  'check:lint': (args, options) => ({
    targetDirectory: args[0],
    fix: options.fix ?? false,
    scope: options.scope,
  }),
  'check:client': (args) => ({ clientDir: args[0] }),
  'import:design-system': (args) => ({
    outputDir: args[0],
    strategy: args[1],
    filterPath: args[2],
  }),
  'generate:ia': (args) => ({
    outputDir: args[0],
    flowFiles: Array.isArray(args[1]) ? args[1] : args.slice(1),
  }),
  'copy:example': (args) => ({ exampleName: args[0], destination: args[1] }),
};

const prepareCommandData = (alias: string, args: string[], options: Record<string, unknown>): CommandData => {
  const mapper = commandMappers[alias];
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

interface LoadedCommand {
  handler?: unknown;
  description: string;
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
    '@auto-engineer/flowlang',
    '@auto-engineer/emmett-generator',
    '@auto-engineer/server-implementer',
    // Add more plugins as needed
  ]
};`);
    process.exit(1);
  }

  // Use plugin system
  output.info('Loading plugins from auto.config.ts...');

  try {
    const pluginLoader = new PluginLoader();
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
          const argString = arg.required === true ? `<${arg.name}>` : `[${arg.name}]`;
          cmd.argument(argString, arg.description ?? '');
        });
      }

      // Add options from the command manifest
      if (command.options) {
        command.options.forEach((opt) => {
          cmd.option(opt.name, opt.description ?? '');
        });
      }

      cmd.action(async (...args: unknown[]) => {
        try {
          await analytics.track({ command: alias, success: true });

          // Extract arguments and options
          const cmdArgs = args.slice(0, -2); // Last two are command and options
          const options = args[args.length - 1] as Record<string, unknown>;
          const nonEmptyArgs = cmdArgs.filter((arg): arg is string => typeof arg === 'string' && arg !== '');

          // Prepare command data based on the command type
          const commandData = prepareCommandData(alias, nonEmptyArgs, options);

          // Execute through the plugin loader which will dispatch via message bus
          await pluginLoader.executeCommand(alias, commandData);

          await analytics.track({ command: alias, success: true });
        } catch (error) {
          await analytics.track({ command: alias, success: false });
          handleError(error as Error);
        }
      });
      program.addCommand(cmd);
    }

    const pluginCount = pluginLoader.getLoadedPluginCount();
    output.success(`Loaded ${commands.size} commands from ${pluginCount} plugins`);
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

    const fullProgram = await setupProgram(config);
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
