import createJiti from 'jiti';
import createDebug from 'debug';
import { getRegistrations, getPendingDispatches } from '../dsl';
import type { ConfigDefinition } from '../dsl/types';
import type { MessageBusServer } from './server';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const debug = createDebug('auto:cli:server:config');

export interface AutoConfig extends ConfigDefinition {
  fileSync?: {
    enabled?: boolean;
    dir?: string;
    extensions?: string[];
  };
  token?: string;
}

let configLoading = false;

/**
 * Load and parse the auto.config.ts file
 */
export async function loadAutoConfig(configPath: string): Promise<AutoConfig> {
  if (configLoading) {
    debug('Config already loading, returning empty config');
    return { fileId: '', plugins: [] };
  }

  try {
    configLoading = true;
    debug('Loading config from:', configPath);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const dslExportsPath = join(__dirname, '..', 'dsl-exports.js');

    const jiti = createJiti(import.meta.url, {
      interopDefault: true,
      moduleCache: false,
      alias: {
        '@auto-engineer/cli': dslExportsPath,
      },
    });

    const configModule = await jiti.import<{ default?: AutoConfig } & AutoConfig>(configPath);
    const config = configModule.default ?? configModule;

    debug('Config loaded successfully');
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    throw error;
  } finally {
    configLoading = false;
  }
}

async function loadAndRegisterPlugins(configPath: string, config: AutoConfig, server: MessageBusServer): Promise<void> {
  if (config.plugins === undefined || config.plugins.length === 0) {
    return;
  }

  try {
    debug('Loading plugins for metadata:', config.plugins);
    const { PluginLoader } = await import('../plugin-loader');
    const pluginLoader = new PluginLoader();
    await pluginLoader.loadPlugins(configPath);

    const unifiedHandlers = pluginLoader.getUnifiedHandlers();
    const commandHandlers = Array.from(unifiedHandlers.values());

    if (commandHandlers.length > 0) {
      debug('Registering %d unified command handlers from plugins', commandHandlers.length);
      server.registerCommandHandlers(commandHandlers);
    }

    debug('Loaded %d unified handlers from plugins', unifiedHandlers.size);
  } catch (error) {
    debug('Failed to load plugin metadata:', error);
  }
}

function registerDslRegistration(
  registration: ReturnType<typeof getRegistrations>[number],
  server: MessageBusServer,
): void {
  if (registration.type === 'on') {
    debug('Registering event handler:', registration.eventType);
    server.registerEventHandler(registration);
  } else if (registration.type === 'fold') {
    debug('Registering fold:', registration.eventType);
    server.registerFold(registration);
  } else if (registration.type === 'on-settled') {
    debug('Registering settled handler:', registration.commandTypes);
    server.registerSettledHandler(registration);
  }
}

function executePipelineAndRegister(config: AutoConfig, server: MessageBusServer): void {
  if (config.pipeline === undefined || typeof config.pipeline !== 'function') {
    return;
  }

  debug('Executing pipeline function to collect DSL registrations');

  getRegistrations();
  getPendingDispatches();

  config.pipeline();

  const registrations = getRegistrations();
  debug('Collected %d registrations from pipeline', registrations.length);

  server.setDslRegistrations(registrations);

  for (const registration of registrations) {
    registerDslRegistration(registration, server);
  }

  const dispatches = getPendingDispatches();
  if (dispatches.length > 0) {
    debug('Warning: Found pending dispatches at config time:', dispatches.length);
  }
}

export async function loadMessageBusConfig(configPath: string, server: MessageBusServer): Promise<void> {
  getRegistrations();
  getPendingDispatches();

  const config = await loadAutoConfig(configPath);

  await loadAndRegisterPlugins(configPath, config, server);
  executePipelineAndRegister(config, server);

  debug('Message bus configuration loaded and registered');

  server.setupRoutes();
  debug('HTTP routes configured with DSL registrations');
}
