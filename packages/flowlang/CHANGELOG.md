# @auto-engineer/flowlang

## 0.2.0

### Minor Changes

- [`96c6f02`](https://github.com/SamHatoum/auto-engineer/commit/96c6f02989f9856a269367f42e288c7dbf5dd1d3) Thanks [@SamHatoum](https://github.com/SamHatoum)! - Fixes paths and logs

- [`91a124f`](https://github.com/SamHatoum/auto-engineer/commit/91a124ff09ecb5893571d0d6fc86e51eaac7a3f0) Thanks [@SamHatoum](https://github.com/SamHatoum)! - Fixes global bins.

### Patch Changes

- [`988ab04`](https://github.com/SamHatoum/auto-engineer/commit/988ab04530d41e116df9196434c0e57ff2ee11a8) Thanks [@SamHatoum](https://github.com/SamHatoum)! - Fix export:schema command and add comprehensive debug logging
  - Fixed export-schema command to use npx tsx for TypeScript support
  - Added proper JSON extraction from stdout to handle integration logs
  - Resolved issue where export:schema produced empty schemas despite valid flow definitions
  - Added debug library for comprehensive logging throughout flowlang
  - Improved debugging output for flow registration, imports, and integrations
  - Use DEBUG=flowlang:\* environment variable to enable detailed debugging

## 0.1.3

### Patch Changes

- Fix workspace:\* dependencies to use actual version numbers for npm publishing

- Updated dependencies []:
  - @auto-engineer/message-bus@0.0.3

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @auto-engineer/message-bus@0.0.2
