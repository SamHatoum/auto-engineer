# Import design system (import:design-system)

Goal: Copy design system docs into `.context` for downstream steps.

## Command

```bash
pnpm import:design-system
```

## Outputs

- `shopping-assistant/.context/design-system.md`
- `shopping-assistant/.context/design-system-principles.md`

## Validate

```bash
wc -l shopping-assistant/.context/design-system.md
```

## Notes

- IA generation uses the list of atoms from `design-system.md` to inform component composition.
