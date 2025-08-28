import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import createJiti from 'jiti';
import createDebug from 'debug';
import { createMessageBus, type MessageBus } from '@auto-engineer/message-bus';
import type { Command, CommandHandler } from '@auto-engineer/message-bus';
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

  // For testing - allow overrides
  public loadConfig?: (configPath: string) => Promise<PluginConfig>;
  public importPlugin?: (packageName: string) => Promise<unknown>;

  constructor() {
    this.messageBus = createMessageBus();
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
        const config = jiti(configPath) as PluginConfig;
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
      console.error(`Failed to load config from ${configPath}:`, error);
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

  private async processPlugin(
    packageName: string,
    aliasMap: Map<string, { packageName: string; command: unknown }[]>,
  ): Promise<void> {
    debugPlugins('Loading plugin: %s', packageName);
    try {
      const pkg = (await this.loadPlugin(packageName)) as { CLI_MANIFEST?: CliManifest };

      if (!pkg.CLI_MANIFEST) {
        debugPlugins('Package %s does not export CLI_MANIFEST, skipping', packageName);
        return;
      }

      debugPlugins('Found CLI_MANIFEST in %s', packageName);
      const manifest = pkg.CLI_MANIFEST;

      // Track that this plugin was successfully loaded
      this.loadedPlugins.add(packageName);

      // Process each command in the manifest
      for (const [alias, command] of Object.entries(manifest.commands)) {
        debugPlugins('Processing command %s from %s', alias, packageName);

        // Add the category from the manifest to each command
        const commandWithCategory = {
          ...command,
          category: manifest.category ?? packageName,
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
    } catch (error) {
      debugPlugins('Failed to load plugin %s: %O', packageName, error);
      console.warn(`Failed to load plugin ${packageName}:`, error);
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

    // Register with message bus
    const commandHandler: CommandHandler = {
      name: alias,
      handle: async (command: Command): Promise<void> => {
        debugBus('Handling custom alias command %s', alias);
        await t.handle(command);
      },
    };
    this.messageBus.registerCommandHandler(commandHandler);
    debugBus('Registered custom alias %s with message bus', alias);
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

  private async registerCommand(alias: string, candidate: { packageName: string; command: CliCommand }) {
    // Store the command for CLI use with all metadata
    this.commands.set(alias, {
      handler: candidate.command.handler,
      description: candidate.command.description,
      package: candidate.packageName,
      usage: candidate.command.usage,
      examples: candidate.command.examples,
      args: candidate.command.args,
      options: candidate.command.options,
      category: candidate.command.category,
    });

    // Register the command with the message bus
    debugBus('Registering command %s with message bus', alias);

    // Create a command handler for the message bus
    const commandHandler: CommandHandler = {
      name: alias,
      handle: async (command: Command): Promise<void> => {
        debugBus('Handling command %s via message bus', alias);

        try {
          // Load the actual handler from the plugin
          const module = (await candidate.command.handler()) as Record<string, unknown> & {
            default?: unknown;
            handler?: unknown;
          };
          debugBus('Loaded module for %s', alias);

          // Look for standard handler export patterns
          const handlerName = `handle${alias
            .split(':')
            .map((s) => s[0].toUpperCase() + s.slice(1))
            .join('')}Command`;

          const moduleHandler = module[handlerName];
          const defaultHandler = module.default;
          const namedHandler = module.handler;

          let handler: unknown = null;
          if (moduleHandler !== undefined) {
            handler = moduleHandler;
          } else if (defaultHandler !== undefined) {
            handler = defaultHandler;
          } else if (namedHandler !== undefined) {
            handler = namedHandler;
          }

          if (handler === null) {
            debugBus('Available exports: %o', Object.keys(module));
            throw new Error(`No handler found for command ${alias} in ${candidate.packageName}`);
          }

          debugBus('Found handler for %s, type: %s', alias, typeof handler);

          // Execute the handler with the command
          debugBus('Calling handler with command: %o', command);
          const handlerFunc = handler as (command: Command) => Promise<void>;
          await handlerFunc(command);
          debugBus('Handler execution complete for %s', alias);
        } catch (error) {
          debugBus('Error handling command %s: %O', alias, error);
          throw error;
        }
      },
    };

    // Register with the message bus
    this.messageBus.registerCommandHandler(commandHandler);

    // Set up event listener for command responses if needed
    const responseEventName = `${alias}Response`;
    debugBus('Setting up response listener for %s', responseEventName);
    this.messageBus.subscribeToEvent(responseEventName, {
      name: `${alias}ResponseHandler`,
      handle: async (event: unknown) => {
        debugBus('Received response for %s: %O', alias, event);
        // Handle response if needed (logging, analytics, etc.)
      },
    });
  }

  async executeCommand(commandAlias: string, data: unknown): Promise<void> {
    debugBus('Executing command %s through message bus', commandAlias);

    // Create command object that matches the Command interface
    const command: Command = {
      type: commandAlias,
      data: data as Record<string, unknown>,
      timestamp: new Date(),
      requestId: `cli-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    };

    await this.messageBus.sendCommand(command);
  }

  getCommands(): Map<string, CliCommand> {
    return this.commands;
  }

  getConflicts(): Map<string, string[]> {
    return this.conflicts;
  }
}

export async function loadPlugins(configPath: string): Promise<Map<string, CliCommand>> {
  const loader = new PluginLoader();
  return loader.loadPlugins(configPath);
}
