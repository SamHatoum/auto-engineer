# Generate Information Architecture

Goal: Produce `auto-ia-scheme.json` describing components, organisms, and pages.

## Command

```bash
pnpm generate:information-architecture
```

## Inputs

- Flows: `shopping-assistant/flows/*.flow.ts`
- UX schema: shipped with the package
- Existing IA (optional): `.context/auto-ia-scheme.json`
- Design system atoms: parsed from `.context/design-system.md`

## Outputs

- `shopping-assistant/.context/auto-ia-scheme.json`

## Validate

```bash
jq '.pages.items | keys' shopping-assistant/.context/auto-ia-scheme.json
jq '.organisms.items | keys' shopping-assistant/.context/auto-ia-scheme.json
```

## Troubleshooting

- Missing IA? Ensure `design-system.md` exists in `.context` and the flow file exists.
- Provider errors? Configure an AI provider API key.
