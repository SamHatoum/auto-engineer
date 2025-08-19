---
'@auto-engineer/frontend-checks': patch
---

Fix npm global installation by moving playwright to dependencies

- Moved playwright from devDependencies to dependencies so it's available during install
- Updated postinstall script to use npx for better compatibility
