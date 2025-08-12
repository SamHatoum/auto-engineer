# CLI and scripts

## Monorepo scripts (run at repo root)

- `pnpm init:example` — copy example into `shopping-assistant/` and install
- `pnpm generate:schema` — write `.context/schema.json` (flow JSON)
- `pnpm generate:server` — scaffold server and write `.context/schema.graphql`
- `pnpm import:design-system` — copy DS docs into `.context/`
- `pnpm generate:information-architecture` — write `.context/auto-ia-scheme.json`
- `pnpm generate:client` — scaffold client, write ops, copy schema, run codegen
- `pnpm implement:server` — AI implementer for server slices
- `pnpm implement:client` — AI implementer for client app
- `pnpm generate:all` — runs the full pipeline end-to-end (dev-only convenience)

## CLI (apps/cli)

- `auto-engineer start` — interactive flow/spec creation
- `auto-engineer demo` — demo mode
- `auto-engineer init` — initialize CLI configuration
