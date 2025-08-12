# Architecture and pipeline

Auto is a flow-driven, artifact-oriented pipeline:

1. Flows → `.context/schema.json`

- Single source of truth for commands, events, and states
- Used to scaffold server slices

2. Server scaffold → `.context/schema.graphql`

- Slice files materialize GWT specifications
- Resolvers print an SDL that unblocks client codegen

3. Design system → IA

- Design system docs enumerate atoms; IA uses these to compose molecules/organisms

4. IA → Client scaffold + operations

- IA drives component/page generation and extracts GraphQL operations
- Codegen produces typed client hooks

5. AI implementers

- Server implementer: makes tests/type-check pass
- Client implementer: plans/apply changes and resolves TS/build/runtime errors

Rationale:

- Keep “glue” artifacts in `.context/` to make each step explicit and repeatable
- Allow re-running stages to converge on the latest flows/design without guesswork
