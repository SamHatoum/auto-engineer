# Quickstart: Build the Shopping Assistant

This tutorial walks you from zero to a running Shopping Assistant using Auto’s scripted pipeline. You’ll learn what each step does, how to validate outputs, and how to fix common issues.

## Prerequisites

- Node.js >= 20 and pnpm >= 10 (repo uses `packageManager: pnpm@10.x`)
- macOS/Linux shell
- Optional (for AI-driven steps): one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, or `XAI_API_KEY`

## 1) Initialize the example project

This copies the example into the repo root as `shopping-assistant/` and installs deps there.

```bash
pnpm init:example
```

Expected results:

- New directory: `shopping-assistant/`
- Installed deps for `shopping-assistant/`

## 2) Generate the flow schema (flow JSON only)

This exports flow specs to JSON (no GraphQL yet).

```bash
pnpm generate:schema
```

Expected results:

- `shopping-assistant/.context/schema.json` created/updated

Validation:

```bash
cat shopping-assistant/.context/schema.json | head -n 20
```

## 3) Scaffold server and emit GraphQL schema

This step generates the server code and writes the GraphQL SDL.

```bash
pnpm generate:server
```

What happens:

- Server scaffold under `shopping-assistant/server/src/domain/flows/**`
- Installs server deps and runs a script to print schema

Expected results:

- `shopping-assistant/.context/schema.graphql` created/updated

Validation:

```bash
cat shopping-assistant/.context/schema.graphql
```

## 4) Import design system docs

Copies design system docs into `.context` for downstream steps.

```bash
pnpm import:design-system
```

Expected results:

- `shopping-assistant/.context/design-system.md`
- `shopping-assistant/.context/design-system-principles.md`

## 5) Generate the Information Architecture (IA)

Produces `auto-ia-scheme.json` describing components/pages.

```bash
pnpm generate:information-architecture
```

Expected results:

- `shopping-assistant/.context/auto-ia-scheme.json`

## 6) Generate the client

Creates the React client, GraphQL operations, and runs codegen.

```bash
pnpm generate:client
```

Expected results:

- `shopping-assistant/client/src/components/**`, `src/pages/**`
- `shopping-assistant/client/src/graphql/{queries,mutations}.ts`
- `shopping-assistant/client/schema.graphql`
- Codegen artifacts under `src/gql/**` (depending on starter)

## 7) Implement server with AI

Fills server TODOs, runs tests/type-check, retries as needed.

```bash
pnpm implement:server
```

Expected results:

- Server files updated; tests and type-check pass

## 8) (Optional) Implement client with AI

Plans updates, applies them, fixes TS/build/console errors, and generates a visual report.

```bash
pnpm implement:client
```

Expected results:

- Client files updated with working pages and components wired to GraphQL

## Run the app

- Server:

```bash
cd shopping-assistant/server && pnpm dev
```

- Client:

```bash
cd shopping-assistant/client && pnpm dev
```

## Troubleshooting

- Missing GraphQL SDL? Re-run `pnpm generate:server`.
- IA missing? Re-run `pnpm import:design-system && pnpm generate:information-architecture`.
- TS/build errors in client? Run `pnpm implement:client` to auto-fix.

## Next steps

- See “End-to-end: From flows to running app” for deeper context and artifacts flow.
- Explore Reference → CLI and scripts to understand each command in detail.
