# Run, test, and troubleshoot

## Run server

```bash
cd shopping-assistant/server
pnpm dev
```

Server runs Apollo GraphQL on port 4000 by default.

## Run client

```bash
cd shopping-assistant/client
pnpm dev
```

Client uses the starter’s dev server (see starter docs).

## Tests (server)

```bash
cd shopping-assistant/server
pnpm test
pnpm type-check
```

## Troubleshooting

- GraphQL schema missing:
  - Run `pnpm generate:server` to regenerate `.context/schema.graphql`.
- IA missing or stale:
  - Run `pnpm import:design-system && pnpm generate:information-architecture`.
- Client codegen errors:
  - Ensure `client/schema.graphql` exists and `src/graphql/*.ts` compile; re-run `pnpm generate:client`.
- Type errors after server implementation:
  - Re-run `pnpm implement:server` (it retries fixes), or inspect failing files listed in logs.
- Console errors in client:
  - Re-run `pnpm implement:client` to trigger the console-fix loop.

## Tips

- You can re-run any step safely; artifacts in `.context/` are designed to be regenerated.
- Keep provider keys in your environment for AI steps.
