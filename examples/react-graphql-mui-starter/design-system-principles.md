Theme

- DO NOT MODIFY THE THEME TOKENS UNDER `src/theme.ts`! IMPORTANT

Components

- use atoms from @mui/material instead of creating new ones in components/atoms
- use Typography component from @mui/material for text elements whenever possible

Branding & Visual Identity:

- You must **infer the branding** (tone, visual identity, personality) directly from the MUI theme config in `src/theme.ts` and do NOT change those tokens
- Use the brand's tone and color palette consistently across all components, spacing, interactions, and layout structure.
- Avoid visual indicators like H1/H2 headings — do not use them to represent concepts or sections.
- Communicate page hierarchy through layout, spacing, color intensity, and component usage — **not headings**.

Design Patterns:

- Layouts must be responsive by default.
- Components must reflect brand personality: minimal, bold, playful, formal, etc., as inferred from the theme.
- Component files should be small and composable.

UX Principles:

- Do not use visual headers or hero titles to convey page identity.
- Use dynamic hierarchy expressed through tone, spacing, and primary-color signals.
- Prefer subtle transitions and clear focus indicators.

Page Templates

- **Sidebar with main panel**
  - 30/70 panels
