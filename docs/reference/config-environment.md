# Configuration & environment

## Requirements

- Node.js >= 20, pnpm >= 10
- macOS/Linux shell

## AI providers

Set one of the following to enable AI-powered steps:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `XAI_API_KEY`

## Environment notes

- Some scripts run `pnpm install` inside generated subprojects; ensure network access.
- If your org blocks postinstall scripts, use `pnpm approve-builds` as needed.

## Local dev ports

- Server (Apollo): 4000
- Client (starter-defined): see the starter’s `package.json` scripts
