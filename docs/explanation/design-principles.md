# Design principles and constraints

- Documentation structure follows the Diátaxis framework — Tutorials, How-to guides, Reference, and Explanation. See [Diátaxis](https://diataxis.fr/).
- Minimal scaffolds: generate the simplest viable code; iterate with AI for behavior/UX.
- Strong typing: avoid `any`; rely on generated types and message schemas.
- Separation of concerns: atoms → molecules → organisms → pages; GraphQL ops only in molecules/organisms.
- Artifacts-first pipeline: `.context/` contains glue files (schema.json, schema.graphql, IA JSON, DS docs).
- Test- and type-driven server implementation: server implementer must satisfy tests and type-checks.
