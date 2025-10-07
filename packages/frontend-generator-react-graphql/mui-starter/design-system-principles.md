# Design System Principles

## Branding & Visual Identity

- You must **infer the branding** (tone, visual identity, personality) directly from the TailwindCSS + Shadcn theme defined in `tailwind.config.ts` and supported by component primitives in `design-system.md`.
- Use the brand's tone and color palette consistently across all components, spacing, interactions, and layout structure.
- Avoid visual indicators like H1/H2 headings — do not use them to represent concepts or sections.
- Communicate page hierarchy through layout, spacing, color intensity, and component usage — **not headings**.
- The overall aesthetic should remain clean, minimal, and accessible, reflecting the default Shadcn design language.

---

## Design Patterns

- Layouts must be responsive by default, adapting fluidly across viewport sizes.
- Use a consistent spacing scale: 4 / 8 / 12 / 16 px for visual rhythm and layout balance.
- Components must reflect brand personality — minimal, bold, playful, or formal — as inferred from the Tailwind theme configuration.
- Component files should remain small, composable, and maintain a clear hierarchy (atoms → molecules → organisms → pages).
- Components must rely on Shadcn UI primitives and Tailwind utilities rather than custom inline styles or hardcoded values.
- Follow the visual tokens, colors, and radii defined in `tailwind.config.ts` and referenced in `components.json`.

---

## UX Principles

- Do not use visual headers or hero titles to convey page identity.
- Use dynamic hierarchy expressed through tone, spacing, and primary-color signals.
- Prefer subtle transitions and clear focus indicators to maintain accessibility and continuity.
- All components must gracefully handle empty, loading, and error states using consistent design and tone.
- Interactions should feel intuitive and consistent — avoid over-animation or excessive movement.

---

## Templates

- For the app layout, make sure to use a **non-collapsible sidebar** as the main navigation anchor.
- Layouts should prioritize clarity and structure — sidebar navigation, main content, and supporting regions should align visually.
- Templates should be consistent across pages, using reusable layout primitives defined in the design system.
- Use proportional spacing and adaptive grid patterns based on the Tailwind theme configuration.
- Avoid fixed pixel constraints; layouts should flow naturally with viewport changes.

---

### Reference Files

All design, tone, and interaction behavior should be derived from:

- `tailwind.config.ts` — for theme tokens (colors, spacing, radii, typography)
- `design-system.md` — for component primitives and base UI definitions
- `components.json` — for mapped component structure and metadata
