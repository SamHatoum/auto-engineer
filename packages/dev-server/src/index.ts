import { commandHandler as startServerHandler } from './commands/start-server';
import { commandHandler as startClientHandler } from './commands/start-client';

export const COMMANDS = [startServerHandler, startClientHandler];

export {
  commandHandler as startServerCommandHandler,
  type StartServerCommand,
  type StartServerEvents,
  type ServerStartedEvent,
  type ServerStartFailedEvent,
} from './commands/start-server';

export {
  commandHandler as startClientCommandHandler,
  type StartClientCommand,
  type StartClientEvents,
  type ClientStartedEvent,
  type ClientStartFailedEvent,
} from './commands/start-client';
