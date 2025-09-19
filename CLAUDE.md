# CLAUDE.md

- ALWAYS follow the lint / ts rules
  - You are not allowed to relax my strict ts and lint rules
  - You are not allowed to do directives like @ts-ignore
  - Do not use `any` or `as SomeType`. Always type correctly
  - You must fix the underlying issues rather than just make the checks pass

- NEVER AND COMPLETELY UNACCEPTABLE
  - DO NOT make excuses like "The remaining linting issues are type safety improvements that don't affect the core functionality."
  - It's always your problem to make sure the `pnpm -w run check` passes

- ALWAYS check everything still works after you make changes
  - run `pnpm check` at the top level and fix any problems
  - fixing problems counts as a change. If you fix something, rerun `pnpm -w run check` at the top level at the end
  - for each file not yet committed, use the IDE diagnostics tool on them to ensure the IDE is not reporting errors

- ALWAYS assume you messed it up and that it was working before
  - perform a git log and see previous commits when tests fail.
  - You need to look at `origin/main` and `origin/- current_branch` to see why things were passing before any current changes
  - It's safe to assume that what's on git is working typically since every dev runs commit hooks and we have CI/CD checks.

- DO NOT EVER mix js with ts
  - js files only belong in the dist folders.
  - Don't import .js files in my TS files. JS is a concern for the dist dir only

- DO NOT WRITE COMMENTS
  - instead focus on writing self-expressing code with methods and parameters names and placement of these symbols in an order that makes it all read like English.

- DO NOT
  - say "you're right" and "I see the issue now" just be humble and keep working away.
