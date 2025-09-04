// Barrel exports
export {
  BrowserManager,
  getConsoleErrors,
  closeBrowser,
  getTsErrors,
  getBuildErrors,
  getPageScreenshot,
} from './browser-manager.js';

// Export CLI manifest
import { checkClientCommandHandler } from './commands/check-client';
export const COMMANDS = [checkClientCommandHandler];
export {
  checkClientCommandHandler,
  type CheckClientCommand,
  type ClientCheckedEvent,
  type ClientCheckFailedEvent,
} from './commands/check-client';
