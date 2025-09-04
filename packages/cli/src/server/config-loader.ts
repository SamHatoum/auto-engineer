import createJiti from 'jiti';
import createDebug from 'debug';
import { on, dispatch, fold, getRegistrations, getPendingDispatches } from '../dsl';
import type { EventRegistration, FoldRegistration } from '../dsl/types';
import type { MessageBusServer } from './server';

const debug = createDebug('auto-engineer:server:config');

export interface MessageBusConfig {
  state?: unknown;
  handlers?: ((dsl: { on: typeof on; dispatch: typeof dispatch; fold: typeof fold }) => void) | unknown;
  folds?: ((dsl: { fold: typeof fold }) => void) | unknown;
  commandHandlers?: unknown[];
}

export interface AutoConfig {
  plugins?: string[];
  messageBus?: MessageBusConfig;
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
    return { plugins: [] };
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
 * Process handlers from config
 */
function processHandlers(
  handlers: unknown,
  server: MessageBusServer,
  dsl: { on: typeof on; dispatch: typeof dispatch; fold: typeof fold },
): void {
  if (typeof handlers === 'function') {
    // Call the handlers function with DSL functions
    (handlers as (dsl: { on: typeof on; dispatch: typeof dispatch; fold: typeof fold }) => void)(dsl);
  } else if (Array.isArray(handlers)) {
    // If handlers is an array of registrations
    for (const handler of handlers) {
      const h = handler as { type: string };
      if (h.type === 'on') {
        server.registerEventHandler(handler as EventRegistration);
      } else if (h.type === 'fold') {
        server.registerFold(handler as FoldRegistration);
      }
    }
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
  if (config.plugins && config.plugins.length > 0) {
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

  // Check if any DSL functions were called during config load
  const topLevelRegistrations = getRegistrations();
  if (topLevelRegistrations.length > 0) {
    debug('Processing top-level DSL registrations:', topLevelRegistrations.length);

    for (const registration of topLevelRegistrations) {
      if (registration.type === 'on') {
        debug('Registering event handler:', registration.eventType);
        server.registerEventHandler(registration);
      } else if (registration.type === 'fold') {
        debug('Registering fold:', registration.eventType);
        server.registerFold(registration);
      }
    }
  }

  if (!config.messageBus) {
    debug('No messageBus configuration found');
    return;
  }

  const { state, handlers, folds, commandHandlers } = config.messageBus;

  // Initialize state if provided
  if (state !== null && state !== undefined) {
    debug('Initializing state:', state);
    server.initializeState(state);
  }

  // Register command handlers if provided
  if (commandHandlers && Array.isArray(commandHandlers)) {
    debug('Registering command handlers:', commandHandlers.length);
    server.registerCommandHandlers(commandHandlers);
  }

  // Execute handlers function to collect registrations
  if (handlers !== null && handlers !== undefined) {
    debug('Processing event handlers');
    processHandlers(handlers, server, { on, dispatch, fold });

    // Get and process registrations
    const registrations = getRegistrations();
    debug('Collected registrations:', registrations.length);

    for (const registration of registrations) {
      if (registration.type === 'on') {
        server.registerEventHandler(registration);
      } else if (registration.type === 'fold') {
        server.registerFold(registration);
      }
    }

    // Process any pending dispatches (shouldn't be any at config time)
    const dispatches = getPendingDispatches();
    if (dispatches.length > 0) {
      debug('Warning: Found pending dispatches at config time:', dispatches.length);
    }
  }

  // Execute folds function if separate
  if (folds !== null && folds !== undefined && typeof folds === 'function') {
    debug('Processing fold functions');
    (folds as (dsl: { fold: typeof fold }) => void)({ fold });

    const registrations = getRegistrations();
    for (const registration of registrations) {
      if (registration.type === 'fold') {
        server.registerFold(registration);
      }
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
} {
  const eventHandlers: EventRegistration[] = [];
  const folds: FoldRegistration[] = [];

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
    }
  }

  return { eventHandlers, folds };
}
