---
'@auto-engineer/flowlang': patch
---

Fix export:schema command and add comprehensive debug logging

- Fixed export-schema command to use npx tsx for TypeScript support
- Added proper JSON extraction from stdout to handle integration logs
- Resolved issue where export:schema produced empty schemas despite valid flow definitions
- Added debug library for comprehensive logging throughout flowlang
- Improved debugging output for flow registration, imports, and integrations
- Use DEBUG=flowlang:\* environment variable to enable detailed debugging
