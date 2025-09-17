// Module augmentation to extend CLI's CommandHandlerRegistry
// This allows the CLI's type-safe DSL to work with our command types

import type { CheckTestsEvents } from './src/commands/check-tests';
import type { CheckTypesEvents } from './src/commands/check-types';
import type { CheckLintEvents } from './src/commands/check-lint';

declare module '@auto-engineer/cli' {
  interface CommandHandlerRegistry {
    CheckTests: { handle: () => Promise<CheckTestsEvents> };
    CheckTypes: { handle: () => Promise<CheckTypesEvents> };
    CheckLint: { handle: () => Promise<CheckLintEvents> };
  }
}
