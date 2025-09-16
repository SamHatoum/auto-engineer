import { commandHandler as implementServerHandler } from './commands/implement-server';
import { commandHandler as implementSliceHandler } from './commands/implement-slice';

export const COMMANDS = [implementServerHandler, implementSliceHandler];
export { implementServerHandler, implementSliceHandler };
export {
  type ImplementServerCommand,
  type ImplementServerEvents,
  type ServerImplementedEvent,
  type ServerImplementationFailedEvent,
} from './commands/implement-server';
export {
  handleImplementSliceCommand,
  type ImplementSliceCommand,
  type ImplementSliceEvents,
  type SliceImplementedEvent,
  type SliceImplementationFailedEvent,
} from './commands/implement-slice';
