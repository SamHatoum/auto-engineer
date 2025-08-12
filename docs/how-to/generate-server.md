# Generate server (generate:server)

Goal: Scaffold server code from flow specs and emit GraphQL SDL.

## Command

```bash
pnpm generate:server
```

## What it does

- Reads `.context/schema.json`
- Generates files under `shopping-assistant/server/src/domain/flows/**` for each slice:
  - Command slices: `commands.ts`, `events.ts`, `state.ts`, `decide.ts`, `evolve.ts`, `handle.ts`, `mutation.resolver.ts`, `decide.specs.ts`, `register.ts`
  - React slices: `react.ts`, `react.specs.ts`, `register.ts`
  - Query slices: `projection.ts`, `state.ts`, `projection.specs.ts`, `query.resolver.ts`
- Installs server dependencies and writes `.context/schema.graphql` by building resolvers

## Outputs

- `shopping-assistant/server/src/domain/flows/**`
- `shopping-assistant/.context/schema.graphql`

## Validate

```bash
ls shopping-assistant/server/src/domain/flows
cat shopping-assistant/.context/schema.graphql
```

## Troubleshooting

- Missing GraphQL SDL? Re-run `pnpm generate:server`.
- If resolver glob finds no files, ensure the generator wrote `*.resolver.ts` in slices.
- Type issues? Run in server dir: `pnpm type-check` or `pnpm test` to inspect.
