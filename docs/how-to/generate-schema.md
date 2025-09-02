# Generate flow schema (generate:schema)

Goal: Produce flow JSON (`.context/schema.json`). This step does NOT generate GraphQL.

## Command

```bash
pnpm generate:schema
```

## What it runs under the hood

- `cd shopping-assistant/server && pnpm install && pnpm build`
  - In the example, `build` may only compile; it doesn’t print GraphQL.
- `cd .. && pnpm build:flow-schema`
  - Executes `scripts/export-schema.ts` to write `.context/schema.json`

## Outputs

- `shopping-assistant/.context/schema.json`

## Validate

```bash
jq '.variant' shopping-assistant/.context/schema.json
jq '.messages | length' shopping-assistant/.context/schema.json
```

## Troubleshooting

- File missing? Ensure `shopping-assistant/flows/*.flow.ts` exists (from `pnpm init:example`).
- Errors in export? Run: `node --loader tsx shopping-assistant/scripts/export-schema.ts` for direct logs.
