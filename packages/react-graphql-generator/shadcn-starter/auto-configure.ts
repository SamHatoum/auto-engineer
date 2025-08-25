import { createFile, templatePropsAIMapper } from '@auto-engineer/react-graphql-generator';

await createFile(
  'index.css.ejs',
  'index.css',
  templatePropsAIMapper('./.context/figma-variables.json', {
    prompt: `
I have these strictly named css variables:
{
  "tokens": {
    "radius": "0.5rem",
    "background": "",
    "foreground": "",
    "card": "",
    "card-foreground": "",
    "popover": "",
    "popover-foreground": "",
    "primary": "",
    "primary-foreground": "",
    "secondary": "",
    "secondary-foreground": "",
    "muted": "",
    "muted-foreground": "",
    "accent": "",
    "accent-foreground": "",
    "destructive": "",
    "destructive-foreground": "",
    "border": "",
    "input": "",
    "ring": "",
    "chart-1": "",
    "chart-2": "",
    "chart-3": "",
    "chart-4": "",
    "chart-5": "",
    "sidebar": "",
    "sidebar-foreground": "",
    "sidebar-primary": "",
    "sidebar-primary-foreground": "",
    "sidebar-accent": "",
    "sidebar-accent-foreground": "",
    "sidebar-border": "",
    "sidebar-ring": ""
  },
  "tokensDark": {
    "background": "",
    "foreground": "",
    "card": "",
    "card-foreground": "",
    "popover": "",
    "popover-foreground": "",
    "primary": "",
    "primary-foreground": "",
    "secondary": "",
    "secondary-foreground": "",
    "muted": "",
    "muted-foreground": "",
    "accent": "",
    "accent-foreground": "",
    "destructive": "",
    "destructive-foreground": "",
    "border": "",
    "input": "",
    "ring": "",
    "sidebar": "",
    "sidebar-foreground": "",
    "sidebar-primary": "",
    "sidebar-primary-foreground": "",
    "sidebar-accent": "",
    "sidebar-accent-foreground": "",
    "sidebar-border": "",
    "sidebar-ring": ""
  }
}

INSTRUCTIONS:
- Map the figma variables into the strictly named css variables above.
- If there is not a match reset that value to a zero-like value.
- If the variable doesn't have a dark mode, map the same light mode value to the dark mode.
- IMPORTANT: some of these given values are in hsl format, don't modify them, and make sure you always assign the value of the tokens as given to you. Sometimes values can consist of more than one value like this: 48 100% 50%
- Return in the format: { "tokens": { ... }, "tokensDark": { ... } }
`,
  }),
);
