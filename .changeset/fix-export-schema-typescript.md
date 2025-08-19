---
'@auto-engineer/flowlang': patch
---

Fix export:schema command to properly handle TypeScript flow files

- Fixed export-schema command to use npx tsx for TypeScript support
- Added proper JSON extraction from stdout to handle integration logs
- Resolved issue where export:schema produced empty schemas despite valid flow definitions
