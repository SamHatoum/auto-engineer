# Implement server (implement:server)

Goal: Fill server TODOs using AI and make tests/type-check pass.

## Command

```bash
pnpm implement:server
```

## Behavior

- For each slice (`server/src/domain/flows/**/<slice>/`):
  - Find files with `TODO:` or `IMPLEMENTATION INSTRUCTIONS`
  - Prompt AI with the target file and all sibling files for context
  - Write back the full updated file
  - Run tests (`vitest`) and type-check, collect failures
  - Retry up to 5 times for type errors and up to 5 times for test failures

## When it succeeds

- Tests pass and type-check is clean for the slice

## Tips

- Set an AI key: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, etc.
- You can re-run after editing flows or specs to evolve behavior.
- Review generated tests (e.g., `*.specs.ts`) to understand expected logic.
