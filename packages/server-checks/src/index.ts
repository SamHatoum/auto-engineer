import { commandHandler as checkTypesHandler } from './commands/check-types';
import { commandHandler as checkLintHandler } from './commands/check-lint';
import { commandHandler as checkTestsHandler } from './commands/check-tests';

export const COMMANDS = [checkTypesHandler, checkLintHandler, checkTestsHandler];
export {
  commandHandler as checkTypesCommandHandler,
  type CheckTypesCommand,
  type TypeCheckPassedEvent,
  type TypeCheckFailedEvent,
} from './commands/check-types';
export {
  commandHandler as checkTestsCommandHandler,
  type CheckTestsCommand,
  type TestsCheckPassedEvent,
  type TestsCheckFailedEvent,
} from './commands/check-tests';
export {
  commandHandler as checkLintCommandHandler,
  type CheckLintCommand,
  type LintCheckPassedEvent,
  type LintCheckFailedEvent,
} from './commands/check-lint';
