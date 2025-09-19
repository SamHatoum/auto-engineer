import createJiti from 'jiti';
import createDebug from 'debug';
import { on, dispatch, fold, getRegistrations, getPendingDispatches } from '../dsl';
import type { EventRegistration, FoldRegistration, SettledRegistration, ConfigDefinition } from '../dsl/types';
import type { MessageBusServer } from './server';

const debug = createDebug('auto-engineer:server:config');

export interface AutoConfig extends ConfigDefinition {
  fileSync?: {
    enabled?: boolean;
    dir?: string;
    extensions?: string[];
  };
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

    // Use jiti to load TypeScript config
    const jiti = createJiti(import.meta.url, {
      interopDefault: true,
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

/**
 * Load message bus configuration and register handlers
 */
// eslint-disable-next-line complexity
export async function loadMessageBusConfig(configPath: string, server: MessageBusServer): Promise<void> {
  // Clear any previous registrations
  getRegistrations();
  getPendingDispatches();

  const config = await loadAutoConfig(configPath);

  // Load plugins if configured to get command metadata
  if (config.plugins !== undefined && config.plugins.length > 0) {
    try {
      debug('Loading plugins for metadata:', config.plugins);
      const { PluginLoader } = await import('../plugin-loader');
      const pluginLoader = new PluginLoader();
      await pluginLoader.loadPlugins(configPath);

      // Register unified command handlers from plugin loader
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

  // Execute pipeline function if present to collect DSL registrations
  if (config.pipeline && typeof config.pipeline === 'function') {
    debug('Executing pipeline function to collect DSL registrations');

    // Clear any previous registrations
    getRegistrations();
    getPendingDispatches();

    // Execute the pipeline function
    config.pipeline();

    // Get and process registrations collected during pipeline execution
    const registrations = getRegistrations();
    debug('Collected %d registrations from pipeline', registrations.length);

    for (const registration of registrations) {
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

    // Process any pending dispatches (shouldn't be any at config time)
    const dispatches = getPendingDispatches();
    if (dispatches.length > 0) {
      debug('Warning: Found pending dispatches at config time:', dispatches.length);
    }
  }

  debug('Message bus configuration loaded and registered');
}

/**
 * Parse DSL code directly (for testing or dynamic configuration)
 */
export function parseDslCode(code: string): {
  eventHandlers: EventRegistration[];
  folds: FoldRegistration[];
  settledHandlers: SettledRegistration[];
} {
  const eventHandlers: EventRegistration[] = [];
  const folds: FoldRegistration[] = [];
  const settledHandlers: SettledRegistration[] = [];

  // Execute the code with DSL functions
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const func = new Function('on', 'dispatch', 'fold', code) as (
    onFn: typeof on,
    dispatchFn: typeof dispatch,
    foldFn: typeof fold,
  ) => void;
  func(on, dispatch, fold);

  // Collect registrations
  const registrations = getRegistrations();

  for (const registration of registrations) {
    if (registration.type === 'on') {
      eventHandlers.push(registration);
    } else if (registration.type === 'fold') {
      folds.push(registration);
    } else if (registration.type === 'on-settled') {
      settledHandlers.push(registration);
    }
  }

  return { eventHandlers, folds, settledHandlers };
}
