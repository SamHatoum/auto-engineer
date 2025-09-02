# CLI Guide

Auto Engineer provides a command-line interface (CLI) powered by plugins. Run `auto --help` to see available commands based on your installed plugins. Below are the common commands provided by core plugins.

## Flow Development

- `create:example --name=<project-name>`Creates an example project with the specified name.
- `export:schema --output-dir=<dir> --directory=<flows-dir>`Exports flow schemas to the specified output directory.

## Server Generation

- `generate:server --schema-path=<schema> --destination=<dest>`Generates server code from a schema file.
- `implement:server --server-directory=<dir>`Uses AI to implement the server code in the specified directory.
- `implement:slice --server-directory=<dir> --slice=<name>`Implements a specific server slice.

## Frontend Generation

- `generate:ia --output-dir=<dir> --flow-files=<patterns>`Generates an information architecture schema from flow files.
- `generate:client --starter-template=<template> --client-dir=<dir> --ia-schema=<file> --gql-schema=<file>`Generates a React client using the specified template and schemas.
- `implement:client --project-dir=<dir> --ia-scheme-dir=<dir> --design-system-path=<file>`Uses AI to implement the client code.

## Validation and Testing

- `check:types --target-directory=<dir> --scope=<project|changed>`Runs TypeScript type checking on the specified directory.
- `check:tests --target-directory=<dir> --scope=<project|changed>`Runs test suites for the specified directory.
- `check:lint --target-directory=<dir> --fix --scope=<project|changed>`Runs linting with an optional auto-fix feature.
- `check:client --client-directory=<dir> --skip-browser-checks`Performs full frontend validation, with an option to skip browser checks.

## Design System

- `import:design-system --figma-file-id=<id> --figma-access-token=<token> --output-dir=<dir>`Imports a design system from Figma.

## Notes

- All commands use named parameters for clarity (e.g., `--input-path=value`).
- Commands are provided by installed plugins. Ensure the relevant plugins are installed as described in Installation.
- For help with a specific command, run `auto <command> --help`.

## Next Steps

- Learn how to configure plugins in Configuration Basics.
- Explore flow modeling in Building a Flow.
