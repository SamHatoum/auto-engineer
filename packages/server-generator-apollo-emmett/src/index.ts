import { commandHandler as generateServerHandler } from './commands/generate-server';

export const COMMANDS = [generateServerHandler];
export {
  type GenerateServerCommand,
  type ServerGeneratedEvent,
  type ServerGenerationFailedEvent,
} from './commands/generate-server';
