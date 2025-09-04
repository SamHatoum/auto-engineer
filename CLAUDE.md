# CLAUDE.md

- ALWAYS follow the lint / ts rules
  - You are not allowed to relax lint rules
  - You are not allowed to do directives like @ts-ignore
  - Do not use `any` or `as SomeType`. Always type correctly
  - You must fix the underlying issues rather than just make the checks pass

- ALWAYS check everything still works after you make changes
  - run `pnpm install` (which runs pnpm build) `pnpm check` at the top level and fix any problems
  - fixing problems counts as a change. If you fix something, rerun `pnpm install` and `pnpm check` at the top level at the end
  - for each file not yet commited, use the IDE diagnostics tool on them to ensure the IDE is not reporting errors

- ALWAYS assume you messed it up and that it was working before
  - perform a git log and see previous commits when tests fail.
  - You need to look at `origin/main` and `origin/- current_branch` to see why things were passing before any current changes
  - It's safe to assume that what's on git is working typically since every dev runs commit hooks and we have CI/CD checks.

- DO NOT EVER mix js with ts
  - js files only belong in the dist folders.
  - Don't import .js files in my TS files. JS is a concern for the dist dir only
