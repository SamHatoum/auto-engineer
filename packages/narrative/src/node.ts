export * from './index.js';

export {
  commandHandler as exportSchemaCommandHandler,
  type ExportSchemaCommand,
  type ExportSchemaEvents,
  type SchemaExportedEvent,
  type SchemaExportFailedEvent,
} from './commands/export-schema.js';

import { commandHandler as exportSchemaHandler } from './commands/export-schema.js';
export const COMMANDS = [exportSchemaHandler];
