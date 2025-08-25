# FAQ

- Does `generate:schema` create GraphQL?
  - No. It creates flow JSON only. GraphQL is produced by `generate:server`.
- Where are outputs written?
  - Under `shopping-assistant/.context/`:
    - `schema.json`, `schema.graphql`, `auto-ia-scheme.json`, `design-system*.md`
- Can I re-run steps safely?
  - Yes. Steps are idempotent over artifacts; re-running refreshes from current sources.
- Do I need an AI key?
  - For IA generation and `implement:*` steps. Not required for pure scaffolding.
- How do I validate the pipeline worked?
  - Inspect `.context/` files, ensure server runs on 4000, and client routes match IA pages.
- Can I change the flows and regenerate?
  - Yes. Update flows, then re-run: `generate:schema` → `generate:server` → `generate:client`.
