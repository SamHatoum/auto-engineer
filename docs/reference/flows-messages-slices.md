# Flows, messages, and slices

## Concepts

- Flow: a business capability composed of slices
- Slice types:
  - Command: validate inputs + inspect state + emit events (never mutate state)
  - React: respond to events by sending commands
  - Query: project events into read models (no emitting or throwing)

## Messages

- Canonical catalog in `.context/schema.json`:
  - Commands: input contracts
  - Events: domain facts
  - States: read-model documents

## Mapping to code

- Command slice → files: `commands.ts`, `events.ts`, `state.ts`, `decide.ts`, `evolve.ts`, `handle.ts`, `mutation.resolver.ts`, `decide.specs.ts`, `register.ts`
- React slice → files: `react.ts`, `react.specs.ts`, `register.ts`
- Query slice → files: `projection.ts`, `state.ts`, `projection.specs.ts`, `query.resolver.ts`

## Example (condensed)

- GWT: `when: EnterShoppingCriteria` → `then: ShoppingCriteriaEntered`
  - Generated: `decide.ts` (returns event), `handle.ts` (applies handler)
- GWT: `when: ShoppingCriteriaEntered` → `then: SuggestShoppingItems`
  - Generated: `react.ts` / subscription in `register.ts`
- GWT: `given: ShoppingItemsSuggested` → `then: State: SuggestedItems`
  - Generated: `projection.ts` and `query.resolver.ts`

## GraphQL integration

- Mutations for command slices (TypeGraphQL resolvers)
- Queries for query slices (TypeGraphQL resolvers)
- SDL printed to `.context/schema.graphql`
