# End-to-end: From flows to running app

This tutorial explains the Auto pipeline in detail, mapping each step to its inputs, outputs, and validation checks.

## High-level pipeline

1. `init:example` → copy example project
2. `generate:schema` → flow JSON (no GraphQL)
3. `generate:server` → server scaffold + GraphQL SDL
4. `import:design-system` → copy DS docs to `.context/`
5. `generate:information-architecture` → IA JSON
6. `generate:client` → client scaffold + GraphQL ops + codegen
7. `implement:server` → fill server TODOs with AI
8. `implement:client` → improve client via AI

## Detailed steps and artifacts

### 1) Initialize

```bash
pnpm init:example
```

Outputs:

- `shopping-assistant/` created

### 2) Flow JSON

```bash
pnpm generate:schema
```

Outputs:

- `.context/schema.json` — canonical messages, flows, and integrations
  Check:

```bash
jq '.messages|length' shopping-assistant/.context/schema.json
```

### 3) Server + GraphQL SDL

```bash
pnpm generate:server
```

Outputs:

- `server/src/domain/flows/**` — commands/events/state/decide/evolve/resolvers/projections
- `.context/schema.graphql` — printed from resolvers
  Check:

```bash
ls shopping-assistant/server/src/domain/flows
cat shopping-assistant/.context/schema.graphql
```

### 4) Design system docs

```bash
pnpm import:design-system
```

Outputs:

- `.context/design-system.md`, `.context/design-system-principles.md`
  Check:

```bash
wc -l shopping-assistant/.context/design-system.md
```

### 5) Information Architecture

```bash
pnpm generate:information-architecture
```

Outputs:

- `.context/auto-ia-scheme.json`
  Check:

```bash
jq '.pages.items | keys' shopping-assistant/.context/auto-ia-scheme.json
```

### 6) Client scaffold + GQL ops + codegen

```bash
pnpm generate:client
```

Outputs:

- `client/src/components/**`, `client/src/pages/**`
- `client/src/graphql/{queries,mutations}.ts`
- `client/schema.graphql`
- Codegen outputs in `client/src/gql/**`
  Check:

```bash
ls shopping-assistant/client/src/graphql
```

### 7) Implement server (AI)

```bash
pnpm implement:server
```

Behavior:

- Implements files with TODO/INSTRUCTIONS
- Runs tests and type-check; retries

### 8) Implement client (AI)

```bash
pnpm implement:client
```

Behavior:

- Plans create/update changes
- Fixes TS/build/console errors; produces a visual report

## Run locally

- Server: `cd shopping-assistant/server && pnpm dev`
- Client: `cd shopping-assistant/client && pnpm dev`

## Tips

- Re-run any step to refresh artifacts from current sources
- Keep an eye on `.context/` — it’s the source of truth that glues steps together
