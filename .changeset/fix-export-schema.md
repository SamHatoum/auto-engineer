---
'@auto-engineer/flowlang': patch
---

Fix export:schema command module resolution issue

Fixed an issue where `auto export:schema` would produce empty schema files due to module context mismatch. The export-schema-helper now imports getFlows from the project's node_modules to ensure the same module context is used, allowing integrations to be properly registered and included in the schema.
