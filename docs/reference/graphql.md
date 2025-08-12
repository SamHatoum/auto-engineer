# GraphQL schema & operations

## Server

- Resolvers are discovered via glob: `src/domain/flows/**/*.resolver.{ts,js}`
- `scripts/generate-schema.ts` builds schema with TypeGraphQL and prints the SDL
- Output path: `shopping-assistant/.context/schema.graphql`

Validate:

```bash
cat shopping-assistant/.context/schema.graphql | head -n 30
```

## Client

- IA data requirements provide operation documents
- Extracted into `src/graphql/queries.ts` and `src/graphql/mutations.ts` as `graphql(\`...\`)`
- `schema.graphql` copied to client root
- Codegen runs to produce typed hooks and helpers under `src/gql/**`

Validate:

```bash
ls shopping-assistant/client/src/gql
```

## Notes

- If SDL and operations drift, re-run `generate:server` then `generate:client`
