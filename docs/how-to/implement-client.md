# Implement client (implement:client)

Goal: Improve generated UI into a working app that respects IA and the design system.

## Command

```bash
pnpm implement:client
```

## Behavior

1. Plan

- Build an overall plan (JSON array of create/update changes) using:
  - IA scheme, design-system docs, atoms+props, GraphQL operations, key CSS, file tree

2. Apply

- For each planned change, generate full file contents and write to disk

3. Fix errors (loop)

- Fix TypeScript errors (collect and ask AI for fixes)
- Fix build errors (collect and ask AI for fixes)
- Fix console errors by running the app at `http://localhost:8080` and scanning routes from IA

4. Visual report

- Take screenshots per route and request an image-based report of significant issues

## Constraints

- Use Tailwind and named exports; avoid default exports
- Do not modify `src/graphql/*.ts` or GraphQL documents
- GraphQL operations must be used in molecules/organisms, not atoms

## Validate

- Start client: `cd shopping-assistant/client && pnpm dev`
- Navigate to routes defined in IA (e.g., `/`, `/suggestions/:sessionId`)
