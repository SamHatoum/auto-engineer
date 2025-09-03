# Quickstart

This guide walks you through creating your first application with Auto Engineer.

## Prerequisites

Ensure you have completed the Installation steps, including installing Node.js, pnpm, the Auto Engineer CLI, and at least one AI provider API key.

## Creating Your First App

1. **Create a new example project**: `bash auto create:example --name=shopping-assistant `

2. **Navigate to the project directory**: `bash cd shopping-assistant `

3. **Install dependencies**: `bash pnpm install `

4. **Export flow schemas**: `bash auto export:schema --output-dir=./.context --directory=./flows `

5. **Generate and implement the server**: `bash auto generate:server --schema-path=.context/schema.json --destination=. auto implement:server --server-directory=./server `

6. **Run server validation**: `bash auto check:types --target-directory=./server auto check:tests --target-directory=./server auto check:lint --target-directory=./server --fix `

7. **Generate and implement the frontend** (requires additional plugins): `bash auto generate:ia --output-dir=./.context --flow-files=./flows/\*.flow.ts auto generate:client --starter-template=./shadcn-starter --client-dir=./client \
--ia-schema=./auto-ia.json --gql-schema=./schema.graphql --figma-vars=./figma-vars.json auto implement:client --project-dir=./client --ia-scheme-dir=./.context \
--design-system-path=./design-system.md `

8. **Start the application**: `bash pnpm start `

## Next Steps

- Explore the generated project structure and modify the flow models in the `flows/` directory.
- Learn more about configuring plugins in Configuration Basics.
- See CLI Guide for a full list of available commands.
