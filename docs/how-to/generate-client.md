# Generate client (generate:client)

Goal: Scaffold a React client, extract GraphQL operations, and run codegen.

## Command

```bash
pnpm generate:client
```

## Inputs

- `.context/auto-ia-scheme.json` — IA describing components/pages and data requirements
- `.context/schema.graphql` — server SDL
- Design system atoms directory (from example) for atom swapping

## What it does

- Clones a starter into memory and replaces `src/components/atoms` with your design system atoms
- Generates molecules/organisms/pages under `src/components/**` and `src/pages/**`
- Extracts `data_requirements[].details.gql` from the IA → writes:
  - `src/graphql/queries.ts`
  - `src/graphql/mutations.ts`
- Copies server SDL to `schema.graphql`
- Runs `pnpm install` and `pnpm codegen` inside the client folder

## Outputs

- `shopping-assistant/client/src/components/*`
- `shopping-assistant/client/src/pages/*`
- `shopping-assistant/client/src/graphql/{queries,mutations}.ts`
- `shopping-assistant/client/schema.graphql`
- Codegen outputs under `shopping-assistant/client/src/gql/*` (depending on starter)

## Validate

```bash
ls shopping-assistant/client/src/pages
ls shopping-assistant/client/src/graphql
cat shopping-assistant/client/schema.graphql | head -n 20
```

## Troubleshooting

- Missing IA? Run `pnpm import:design-system && pnpm generate:information-architecture`.
- Codegen errors? Ensure `schema.graphql` exists and ops are valid; re-run `pnpm generate:client`.
