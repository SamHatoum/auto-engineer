import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import createJiti from 'jiti';
import createDebug from 'debug';
import { stringify } from 'yaml';
import chalk from 'chalk';
import { createMessageBus, type MessageBus } from '@auto-engineer/message-bus';
import type { CommandHandler, Command, Event, UnifiedCommandHandler } from '@auto-engineer/message-bus';
import type { CliManifest } from './manifest-types';

const debug = createDebug('cli:plugin-loader');
const debugConfig = createDebug('cli:plugin-loader:config');
const debugPlugins = createDebug('cli:plugin-loader:plugins');
const debugConflicts = createDebug('cli:plugin-loader:conflicts');
const debugBus = createDebug('cli:plugin-loader:bus');

// Set non-error-like colors (avoid red/orange)
// Colors: 0=gray, 1=red, 2=green, 3=yellow, 4=blue, 5=magenta, 6=cyan
debug.color = '4'; // blue
debugConfig.color = '6'; // cyan
debugPlugins.color = '2'; // green
debugConflicts.color = '3'; // yellow (ok for conflicts)
debugBus.color = '4'; // blue

export interface CliCommand {
  handler: () => Promise<unknown>;
  description: string;
  package: string;
  version?: string; // Package version
  usage?: string;
  examples?: string[];
  args?: Array<{ name: string; description: string; required?: boolean }>;
  options?: Array<{ name: string; description: string }>;
  category?: string;
}

export interface PluginConfig {
  plugins: string[];
  aliases?: Record<string, unknown>; // Map custom aliases to command handlers: { 'my-alias': importedHandler }
}

export class PluginLoader {
  private commands = new Map<string, CliCommand>();
  private conflicts = new Map<string, string[]>(); // alias -> [package1, package2, ...]
  private loadedPlugins = new Set<string>(); // Track successfully loaded plugins
  private messageBus: MessageBus;
  private aliasToHandlerName = new Map<string, string>(); // Map CLI alias to handler name
  private hasGlobalEventSubscription = false; // Track if we've set up global event subscription
  private commandMappers = new Map<
    string,
    (args: (string | string[])[], options: Record<string, unknown>) => Record<string, unknown>
  >(); // Dynamic command mappers

  // For testing - allow overrides
  public loadConfig?: (configPath: string) => Promise<PluginConfig>;
  public importPlugin?: (packageName: string) => Promise<unknown>;

  constructor() {
    this.messageBus = createMessageBus();
    this.setupGlobalEventSubscription();
  }

  private setupGlobalEventSubscription(): void {
    if (this.hasGlobalEventSubscription) return;

    this.messageBus.subscribeAll({
      name: 'CLI_GlobalEventLogger',
      handle: async (event: Event) => {
        debugBus('CLI received event: %s', event.type);
        this.handleCommandEvent(event.type, event);
      },
    });

    this.hasGlobalEventSubscription = true;
    debugBus('Global event subscription set up');
  }

  private isValidHandler(item: unknown): boolean {
    return item !== null && item !== undefined && typeof item === 'object' && 'handle' in item && 'name' in item;
  }

  private findCommandHandler(module: Record<string, unknown>): unknown {
    // Look for the command handler - prefer default export
    const handler = module.default ?? module.handler;

    // If default is a valid handler, use it
    if (
      this.isValidHandler(handler) ||
      (handler !== null && handler !== undefined && typeof handler === 'object' && 'handle' in handler)
    ) {
      return handler;
    }

    // Otherwise, look for named exports
    for (const key of Object.keys(module)) {
      const exportedItem = module[key];
      if (this.isValidHandler(exportedItem)) {
        debugBus('Using named export %s as handler', key);
        return exportedItem;
      }
    }

    return handler; // Return whatever we found even if not valid
  }

  private async loadConfigFile(configPath: string): Promise<PluginConfig | null> {
    try {
      if (this.loadConfig) {
        // Use test override
        return await this.loadConfig(configPath);
      }

      // Handle TypeScript config files
      if (configPath.endsWith('.ts')) {
        debugConfig('Loading TypeScript config file with jiti');
        const jiti = createJiti(import.meta.url, {
          interopDefault: true,
        });
        const config = await jiti.import<PluginConfig>(configPath);
        debugConfig('TypeScript config loaded successfully');
        return config;
      }

      // Import JavaScript config file directly
      const configUrl = pathToFileURL(path.resolve(configPath)).href;
      debugConfig('Importing JavaScript config from: %s', configUrl);
      const configModule = (await import(configUrl)) as { default?: PluginConfig };
      return (configModule.default ?? configModule) as PluginConfig;
    } catch (error) {
      debugConfig('Error loading config: %O', error);
      // Only show config loading errors when debugging
      if (process.env.DEBUG?.includes('auto-engineer:') === true) {
        console.error(`Failed to load config from ${configPath}:`, error);
      }
      return null;
    }
  }

  private async loadPlugin(packageName: string): Promise<unknown> {
    try {
      const packagePath = path.join(process.cwd(), 'node_modules', packageName, 'dist', 'src', 'cli-manifest.js');
      if (fs.existsSync(packagePath)) {
        const packageUrl = pathToFileURL(packagePath).href;
        debugPlugins('Trying to load plugin from cwd: %s', packageUrl);
        return await import(packageUrl);
      }

      // Try the shorter path for packages that might have different structure
      const altPath = path.join(process.cwd(), 'node_modules', packageName, 'dist', 'cli-manifest.js');
      if (fs.existsSync(altPath)) {
        const packageUrl = pathToFileURL(altPath).href;
        debugPlugins('Trying to load plugin from cwd (alt path): %s', packageUrl);
        return await import(packageUrl);
      }

      throw new Error('Package not found in node_modules');
    } catch (e) {
      debugPlugins('Failed to load from cwd, trying default import: %s', e);
      return this.importPlugin ? await this.importPlugin(packageName) : await import(packageName);
    }
  }

  private convertUnifiedToCliCommand(handler: UnifiedCommandHandler<Command>, packageName: string): CliCommand {
    // All fields become options (no positional args anymore)
    const options: Array<{ name: string; description: string }> = [];

    for (const [fieldName, fieldDef] of Object.entries(handler.fields)) {
      if (fieldDef.flag === true) {
        // Boolean flag option
        const flagName = `--${fieldName.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/^-/, '')}`;
        options.push({
          name: flagName,
          description: fieldDef.description,
        });
      } else {
        // Regular option
        const optName = `--${fieldName.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/^-/, '')}`;
        options.push({
          name: `${optName} <value>`,
          description: fieldDef.description,
        });
      }
    }

    // Generate usage string without positional args
    const usage = handler.alias;

    return {
      handler: () => Promise.resolve({ default: handler }),
      description: handler.description,
      package: packageName,
      category: handler.category ?? packageName,
      usage,
      examples: handler.examples,
      args: undefined, // No positional args
      options: options.length > 0 ? options : undefined,
    };
  }

  private async processUnifiedCommands(
    packageName: string,
    commands: UnifiedCommandHandler<Command>[],
    aliasMap: Map<string, { packageName: string; command: unknown }[]>,
  ): Promise<void> {
    debugPlugins('Found COMMANDS export (new format) in %s', packageName);
    this.loadedPlugins.add(packageName);

    for (const unifiedHandler of commands) {
      const alias = unifiedHandler.alias;
      debugPlugins('Processing unified command %s from %s', alias, packageName);

      // Convert unified handler to CLI command format
      const cliCommand = this.convertUnifiedToCliCommand(unifiedHandler, packageName);

      if (!aliasMap.has(alias)) {
        aliasMap.set(alias, []);
      }
      aliasMap.get(alias)!.push({
        packageName,
        command: cliCommand,
      });
    }
  }

  private async processManifestCommands(
    packageName: string,
    manifest: CliManifest,
    aliasMap: Map<string, { packageName: string; command: unknown }[]>,
  ): Promise<void> {
    debugPlugins('Found CLI_MANIFEST (old format) in %s', packageName);
    this.loadedPlugins.add(packageName);

    // Process each command in the manifest
    for (const [alias, command] of Object.entries(manifest.commands)) {
      debugPlugins('Processing command %s from %s', alias, packageName);

      // Add the category and version from the manifest to each command
      const commandWithCategory = {
        ...command,
        category: manifest.category ?? packageName,
        version: manifest.version,
      };

      // Track all packages that want this alias
      if (!aliasMap.has(alias)) {
        aliasMap.set(alias, []);
      }
      aliasMap.get(alias)!.push({
        packageName,
        command: commandWithCategory,
      });
    }
  }

  private async processPlugin(
    packageName: string,
    aliasMap: Map<string, { packageName: string; command: unknown }[]>,
  ): Promise<void> {
    debugPlugins('Loading plugin: %s', packageName);
    try {
      const pkg = (await this.loadPlugin(packageName)) as {
        CLI_MANIFEST?: CliManifest;
        COMMANDS?: UnifiedCommandHandler<Command>[];
      };

      // Check for new unified command format first
      if (pkg.COMMANDS) {
        await this.processUnifiedCommands(packageName, pkg.COMMANDS, aliasMap);
        return;
      }

      // Fall back to old CLI_MANIFEST format
      if (!pkg.CLI_MANIFEST) {
        debugPlugins('Package %s does not export CLI_MANIFEST or COMMANDS, skipping', packageName);
        return;
      }

      await this.processManifestCommands(packageName, pkg.CLI_MANIFEST, aliasMap);
    } catch (error) {
      debugPlugins('Failed to load plugin %s: %O', packageName, error);
      // Only show plugin loading errors when debugging
      if (process.env.DEBUG?.includes('auto-engineer:') === true) {
        console.warn(`Failed to load plugin ${packageName}:`, error);
      }
    }
  }

  private async findMatchingCandidate(
    candidates: Array<{ packageName: string; command: unknown }>,
    userOverride: unknown,
  ): Promise<{ packageName: string; command: CliCommand } | null> {
    for (const candidate of candidates) {
      try {
        const cmd = candidate.command as CliCommand;
        const module = (await cmd.handler()) as { default?: unknown; handler?: unknown };
        if (
          module === userOverride ||
          module.default === userOverride ||
          module.handler === userOverride ||
          (module.default as { handler?: unknown })?.handler === userOverride
        ) {
          return candidate as { packageName: string; command: CliCommand };
        }
      } catch (e) {
        debugConflicts('Error checking handler match: %o', e);
      }
    }
    return null;
  }

  private async processConflictResolution(
    alias: string,
    candidates: Array<{ packageName: string; command: unknown }>,
    config: PluginConfig,
  ): Promise<void> {
    const packages = candidates.map((c) => c.packageName);
    debugConflicts('Conflict detected for alias "%s" between packages: %o', alias, packages);

    const userOverride = config.aliases?.[alias];
    if (userOverride === undefined) {
      this.conflicts.set(alias, packages);
      return;
    }

    const isFunction = typeof userOverride === 'function';
    const hasDefault = typeof (userOverride as { default?: unknown }).default === 'function';

    if (!isFunction && !hasDefault) {
      console.error(`\n❌ Invalid override for alias "${alias}"`);
      console.error(`   Expected a command handler function, got: ${typeof userOverride}`);
      console.error(`   Import the handler from one of: ${packages.join(', ')}`);
      this.conflicts.set(alias, packages);
      return;
    }

    const matchingCandidate = await this.findMatchingCandidate(candidates, userOverride);

    if (matchingCandidate !== null) {
      debugConflicts('Using user override for %s with handler from %s', alias, matchingCandidate.packageName);
      await this.registerCommand(alias, matchingCandidate);
    } else {
      console.error(`\n❌ Invalid override for alias "${alias}"`);
      console.error(`   The provided handler does not match any of the conflicting commands`);
      console.error(`   Available packages: ${packages.join(', ')}`);
      this.conflicts.set(alias, packages);
    }
  }

  private processStringAlias(alias: string, target: string): void {
    if (!this.commands.has(target)) return;

    debugPlugins('Creating alias %s -> %s', alias, target);
    const existingCommand = this.commands.get(target)!;
    this.commands.set(alias, {
      ...existingCommand,
      description: `Alias for ${target}`,
    });
  }

  private processHandlerAlias(alias: string, target: unknown): void {
    const t = target as { name?: string; handle: (command: Command) => Promise<unknown> };

    debugPlugins('Registering custom alias %s with CommandHandler', alias);
    const commandEntry: CliCommand = {
      handler: async () => ({ default: target }),
      description: t.name !== undefined && t.name !== '' ? `${t.name} command` : `Custom command: ${alias}`,
      package: 'custom-alias',
    };
    this.commands.set(alias, commandEntry);
  }

  private processFunctionAlias(alias: string, target: unknown): void {
    debugPlugins('Registering custom alias %s with handler function', alias);
    const handlerFunc = typeof target === 'function' ? target : (target as { default: unknown }).default;
    this.commands.set(alias, {
      handler: async () => ({ default: handlerFunc }),
      description: `Custom command: ${alias}`,
      package: 'custom-alias',
    });
  }

  private processCustomAlias(alias: string, target: unknown): void {
    if (typeof target === 'string') {
      this.processStringAlias(alias, target);
    } else if (
      target !== null &&
      target !== undefined &&
      typeof (target as { handle?: unknown }).handle === 'function'
    ) {
      this.processHandlerAlias(alias, target);
    } else if (
      typeof target === 'function' ||
      (target !== null && target !== undefined && typeof (target as { default?: unknown }).default === 'function')
    ) {
      this.processFunctionAlias(alias, target);
    }
  }

  private async processCustomAliases(config: PluginConfig, aliasMap: Map<string, unknown[]>): Promise<void> {
    if (config.aliases === undefined) return;

    for (const [alias, target] of Object.entries(config.aliases)) {
      // Skip if this was already processed as a conflict resolution
      if (!aliasMap.has(alias)) {
        this.processCustomAlias(alias, target);
      }
    }
  }

  private reportConflicts(config: PluginConfig): void {
    if (this.conflicts.size === 0) return;

    console.error('\n❌ Command alias conflicts detected!\n');
    console.error('Multiple packages are trying to register the same command aliases.');
    console.error('Please add alias overrides to your auto.config.ts file:\n');

    console.error('// Import the specific handler you want to use');
    for (const [alias, packages] of this.conflicts.entries()) {
      console.error(`// For "${alias}", import from one of: ${packages.join(', ')}`);
      const examplePkg = packages[0];
      const handlerName = alias.replace(/[:-]/g, '_') + 'Handler';
      console.error(`import { ${handlerName} } from '${examplePkg}';`);
    }
    console.error('');
    console.error('export default {');
    console.error('  plugins: [');
    for (const plugin of config.plugins ?? []) {
      console.error(`    '${plugin}',`);
    }
    console.error('  ],');
    console.error('  aliases: {');

    for (const [alias] of this.conflicts.entries()) {
      const handlerName = alias.replace(/[:-]/g, '_') + 'Handler';
      console.error(`    '${alias}': ${handlerName},`);
    }

    console.error('  }');
    console.error('};\n');

    throw new Error('Unresolved command alias conflicts. Please update your configuration.');
  }

  async loadPlugins(configPath: string): Promise<Map<string, CliCommand>> {
    debug('Loading plugins from config: %s', configPath);

    // Check if config file exists (skip for testing)
    if (!this.loadConfig && !fs.existsSync(configPath)) {
      debugConfig('Config file not found, using default empty config');
      return this.commands;
    }

    const config = await this.loadConfigFile(configPath);
    if (!config) {
      return this.commands;
    }

    debugConfig('Config loaded with %d plugins', config.plugins?.length ?? 0);

    // Load each plugin
    const aliasMap = new Map<string, { packageName: string; command: unknown }[]>();

    for (const packageName of config.plugins ?? []) {
      await this.processPlugin(packageName, aliasMap);
    }

    // Process aliases and detect conflicts
    for (const [alias, candidates] of aliasMap.entries()) {
      if (candidates.length === 1) {
        // No conflict, register the command
        const candidate = candidates[0];
        debugPlugins('Registering command %s from %s', alias, candidate.packageName);
        await this.registerCommand(alias, candidate as { packageName: string; command: CliCommand });
      } else {
        // Conflict detected
        await this.processConflictResolution(alias, candidates, config);
      }
    }

    // Process custom aliases (new command names mapping to handlers or existing commands)
    await this.processCustomAliases(config, aliasMap);

    // Report unresolved conflicts
    this.reportConflicts(config);

    debug(
      'Plugin loading complete. Registered %d commands from %d plugins',
      this.commands.size,
      this.loadedPlugins.size,
    );
    return this.commands;
  }

  getLoadedPluginCount(): number {
    return this.loadedPlugins.size;
  }

  getCommandMapper(
    alias: string,
  ): ((args: (string | string[])[], options: Record<string, unknown>) => Record<string, unknown>) | undefined {
    return this.commandMappers.get(alias);
  }

  private buildCommandMapper(
    alias: string,
    command: CliCommand,
    unifiedHandler?: UnifiedCommandHandler<Command>,
  ): void {
    const mapper = (args: (string | string[])[], options: Record<string, unknown>): Record<string, unknown> => {
      const commandData: Record<string, unknown> = {};

      if (unifiedHandler !== undefined && unifiedHandler.fields !== undefined) {
        // Handle unified command format - all fields are options now
        const fieldsArray = Object.entries(unifiedHandler.fields);

        // Map all options
        fieldsArray.forEach(([fieldName]) => {
          const kebabName = fieldName.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/^-/, '');
          if (options[kebabName] !== undefined) {
            commandData[fieldName] = options[kebabName];
          } else if (options[fieldName] !== undefined) {
            commandData[fieldName] = options[fieldName];
          }
        });
      } else {
        // Fall back to old format
        // Map positional arguments based on the command's args definition
        if (command.args) {
          command.args.forEach((argDef, index) => {
            if (args[index] !== undefined) {
              // Convert arg name to camelCase for the data property
              const propName = argDef.name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
              commandData[propName] = args[index];
            }
          });
        }

        // Map options
        if (command.options) {
          command.options.forEach((optDef) => {
            // Extract option name from format like "--fix" or "--scope <scope>"
            const optMatch = optDef.name.match(/^--([a-zA-Z-]+)/);
            if (optMatch) {
              const optName = optMatch[1].replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
              if (options[optName] !== undefined || options[optMatch[1]] !== undefined) {
                commandData[optName] = options[optName] ?? options[optMatch[1]];
              }
            }
          });
        }
      }

      // Handle special cases for variadic arguments
      if (alias === 'generate:ia' && command.args && command.args.length > 1) {
        commandData.outputDir = args[0];
        commandData.flowFiles = Array.isArray(args[1]) ? args[1] : args.slice(1);
      }

      return commandData;
    };

    this.commandMappers.set(alias, mapper);
    debugPlugins('Built command mapper for %s', alias);
  }

  private async registerCommand(alias: string, candidate: { packageName: string; command: CliCommand }) {
    // Store the command for CLI use with all metadata
    this.commands.set(alias, {
      handler: candidate.command.handler,
      description: candidate.command.description,
      package: candidate.packageName,
      version: candidate.command.version,
      usage: candidate.command.usage,
      examples: candidate.command.examples,
      args: candidate.command.args,
      options: candidate.command.options,
      category: candidate.command.category,
    });

    debugBus('Loading command handler for %s', alias);

    try {
      // Load the actual handler from the plugin
      const module = (await candidate.command.handler()) as Record<string, unknown> & {
        default?: unknown;
        handler?: unknown;
      };
      debugBus('Loaded module for %s', alias);

      // Look for the command handler
      const handler = this.findCommandHandler(module);

      if (handler === null || handler === undefined || typeof handler !== 'object' || !('handle' in handler)) {
        debugBus('Available exports: %o', Object.keys(module));
        debugBus('Default export type: %s', typeof module.default);
        debugBus('Default export value: %o', module.default);
        throw new Error(`No valid CommandHandler found for command ${alias} in ${candidate.packageName}`);
      }

      const commandHandler = handler as CommandHandler;

      // Build and store command mapper based on args and options
      // Pass unified handler if it has fields property
      const unifiedHandler =
        'fields' in handler && (handler as UnifiedCommandHandler<Command>).fields !== undefined
          ? (handler as UnifiedCommandHandler<Command>)
          : undefined;
      this.buildCommandMapper(alias, candidate.command, unifiedHandler);

      // Store mapping from alias to handler name
      this.aliasToHandlerName.set(alias, commandHandler.name);

      // Register with the message bus using the handler's name
      debugBus('Registering command handler %s with message bus', commandHandler.name);
      this.messageBus.registerCommandHandler(commandHandler);
    } catch (error) {
      debugBus('Error registering command %s: %O', alias, error);
      throw error;
    }
  }

  private formatFieldKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  }

  private displayArrayValue(value: unknown[], logFn: (msg: string) => void): void {
    logFn(`   ${value.length} items`);
    if (typeof value[0] === 'string') {
      value.slice(0, 3).forEach((item) => logFn(`     - ${String(item)}`));
      if (value.length > 3) {
        logFn(`     ... and ${value.length - 3} more`);
      }
    }
  }

  private displayFieldValue(key: string, value: unknown, isError: boolean): void {
    const formattedKey = this.formatFieldKey(key);
    const logFn = isError ? console.error : console.log;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      logFn(`   ${formattedKey}: ${String(value)}`);
    } else if (Array.isArray(value) && value.length > 0) {
      logFn(`   ${formattedKey}:`);
      this.displayArrayValue(value, logFn);
    } else if (typeof value === 'object' && value !== null) {
      logFn(`   ${formattedKey}: [object]`);
    }
  }

  private handleCommandEvent(eventType: string, event: Event): void {
    // Handle different event types and log appropriately
    if (eventType.endsWith('Failed') || eventType.endsWith('Error')) {
      this.handleFailureEvent(eventType, event);
    } else if (eventType.endsWith('Passed') || eventType.endsWith('Completed')) {
      this.handleSuccessEvent(eventType, event);
    } else {
      this.displayMessage(event);
    }
  }

  private displayMessage(message: Event | Command): void {
    const data = message.data;
    if (data === null || data === undefined) return;
    let output = '';
    // For simple values, display inline
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      output = `   ${chalk.cyan(String(data))}`;
    } else if (typeof data === 'object') {
      // Strip any ANSI codes that might be in the data values
      // Clean ANSI codes from data for JSON output
      JSON.parse(
        JSON.stringify(data, (_key, value) => {
          if (typeof value === 'string') {
            // eslint-disable-next-line no-control-regex
            return value.replace(/\x1b\[[0-9;]*m/g, '');
          }
          return value as unknown;
        }),
      );
      output = stringify(data, {
        indent: 2,
        lineWidth: 80,
      });
    }

    const date = new Date(message.timestamp || Date.now());
    const timestamp = date.toTimeString().split(' ')[0] + '.' + date.getMilliseconds().toString().padStart(3, '0');

    const isCommand = 'type' in message && !('correlationId' in message);
    const backgroundColor = isCommand ? '#00CED1' : '#FF6B35';

    console.log(chalk.gray(timestamp), chalk.bgHex(backgroundColor).white.bold(` ${message.type} `));
    console.log(this.highlightYaml(output));
  }

  private highlightYaml(yamlStr: string): string {
    // Apply syntax highlighting and indentation
    const highlightedYaml = yamlStr
      .split('\n')
      .filter((line) => line.trim()) // Remove empty lines
      .map((line) => {
        // Apply syntax highlighting
        let highlighted = line;

        // Highlight keys (word before colon)
        highlighted = highlighted.replace(/^(\s*)([a-zA-Z0-9_-]+)(:)/g, (match, indent, key, colon) => {
          return indent + chalk.cyanBright(key) + chalk.gray(colon);
        });

        // Highlight string values (in quotes)
        highlighted = highlighted.replace(/(["'])((?:\\.|(?!\1).)*?)\1/g, (match, quote, content) => {
          return chalk.gray(quote) + chalk.green(content) + chalk.gray(quote);
        });

        // Highlight numbers
        highlighted = highlighted.replace(/:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*$/g, (match, num) => {
          return chalk.gray(':') + ' ' + chalk.yellow(num);
        });

        // Highlight booleans
        highlighted = highlighted.replace(/:\s*(true|false)\s*$/g, (match, bool) => {
          return chalk.gray(':') + ' ' + chalk.magenta(bool);
        });

        // Highlight null
        highlighted = highlighted.replace(/:\s*(null)\s*$/g, (match, nullVal) => {
          return chalk.gray(':') + ' ' + chalk.gray(nullVal);
        });

        // Highlight array markers
        highlighted = highlighted.replace(/^(\s*)(- )/g, (match, indent, marker) => {
          return indent + chalk.gray(marker);
        });

        return `   ${highlighted}`;
      })
      .join('\n');

    return highlightedYaml;
  }

  private displayErrorField(data: Record<string, unknown>): void {
    if (data.error !== undefined && data.error !== null) {
      console.error(`   Error: ${String(data.error)}`);
    }
  }

  private displayErrorsField(data: Record<string, unknown>): void {
    if (data.errors === undefined || data.errors === null) return;

    if (typeof data.errors === 'string') {
      console.error(`   Errors: ${data.errors}`);
    } else if (Array.isArray(data.errors)) {
      console.error(`   Errors: ${data.errors.length}`);
      data.errors.slice(0, 3).forEach((err) => console.error(`     - ${String(err)}`));
      if (data.errors.length > 3) {
        console.error(`     ... and ${data.errors.length - 3} more`);
      }
    }
  }

  private handleFailureEvent(eventType: string, event: Event): void {
    const data = event.data as Record<string, unknown>;
    console.error(`❌ ${eventType}`);

    this.displayErrorField(data);
    this.displayErrorsField(data);

    // Display any other fields in the data object generically
    const displayedFields = new Set(['error', 'errors']);
    for (const [key, value] of Object.entries(data)) {
      if (displayedFields.has(key) || value === null || value === undefined) continue;
      this.displayFieldValue(key, value, true);
    }

    process.exit(1);
  }

  private handleSuccessEvent(eventType: string, event: Event): void {
    const data = event.data as Record<string, unknown>;
    console.log(`✅ ${eventType}`);

    // Display all fields in the data object generically
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      this.displayFieldValue(key, value, false);
    }
  }

  async executeCommand(commandAlias: string, data: unknown): Promise<void> {
    debugBus('Executing command %s through message bus', commandAlias);

    // Get the actual handler name from the alias
    const handlerName = this.aliasToHandlerName.get(commandAlias) ?? commandAlias;
    debugBus('Mapped alias %s to handler %s', commandAlias, handlerName);

    // Create command object that matches the Command interface
    const command: Command = {
      type: handlerName,
      data: data as Record<string, unknown>,
      timestamp: new Date(),
      requestId: `cli-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    };
    this.displayMessage(command);
    await this.messageBus.sendCommand(command);
  }

  getCommands(): Map<string, CliCommand> {
    return this.commands;
  }

  getConflicts(): Map<string, string[]> {
    return this.conflicts;
  }

  getMessageBus(): MessageBus {
    return this.messageBus;
  }
}

export async function loadPlugins(configPath: string): Promise<Map<string, CliCommand>> {
  const loader = new PluginLoader();
  return loader.loadPlugins(configPath);
}
