# Project structure

```
auto-engineer/
  apps/cli/                     # CLI entrypoints (init, start, demo)
  packages/
    emmett-generator/           # Server scaffold and GraphQL schema emit
    design-system-importer/     # Copies DS docs
    information-architect/      # IA agent (flows → IA JSON)
    react-graphql-generator/    # Client scaffold & GraphQL codegen
    server-implementer/         # AI implementer for server
    frontend-implementation/    # AI implementer for client
    flowlang/                   # Flow spec core utilities
    ai-gateway/                 # AI provider abstraction
shopping-assistant/
  client/                       # Generated React app
  server/                       # Generated server
  .context/                     # Glue artifacts (schema.json/graphql, IA, DS docs)
```

Key idea: `.context/` contains artifacts that stitch steps together.
