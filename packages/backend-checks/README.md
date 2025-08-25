# @auto-engineer/backend-checks

Backend validation commands for Auto Engineer projects. Provides discrete, single-responsibility commands for checking types, tests, and linting that can be orchestrated through event-driven workflows.

## Commands

### CheckTypes

Runs TypeScript type checking on a target directory or project.

**Command**: `CheckTypes`
**Events**:

- `TypeCheckPassed` - Emitted when all types are valid
- `TypeCheckFailed` - Emitted when type errors are found

### CheckTests

Runs test suite using Vitest on a target directory or project.

**Command**: `CheckTests`
**Events**:

- `TestsCheckPassed` - Emitted when all tests pass
- `TestsCheckFailed` - Emitted when tests fail

### CheckLint

Runs ESLint checks on TypeScript files in a target directory or project.

**Command**: `CheckLint`  
**Events**:

- `LintCheckPassed` - Emitted when no lint issues found
- `LintCheckFailed` - Emitted when lint issues are detected

## Usage

Each command can be imported and used in event-driven workflows:

```typescript
import {
  handleCheckTypesCommand,
  handleCheckTestsCommand,
  handleCheckLintCommand,
} from '@auto-engineer/backend-checks';

// Run type checking
const typeResult = await handleCheckTypesCommand({
  type: 'CheckTypes',
  data: {
    targetDirectory: './src/domain/flows/order',
    scope: 'slice', // or 'project'
  },
  timestamp: new Date(),
  requestId: 'req-123',
});

// Handle result events
if (typeResult.type === 'TypeCheckFailed') {
  // Retry implementation with error context
}
```

## Integration with Event-Driven Workflows

These commands are designed to work with the `@auto-engineer/message-bus` for event-driven orchestration. Failed checks can trigger re-implementation with error context for self-healing workflows.
