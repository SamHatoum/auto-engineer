import { createFile, templatePropsAIMapper } from '@auto-engineer/react-graphql-generator';

const cssVariables = {
  tokens: {
    radius: '0.5rem',

    background: '',
    foreground: '',

    card: '',
    'card-foreground': '',

    popover: '',
    'popover-foreground': '',

    primary: '',
    'primary-foreground': '',

    secondary: '',
    'secondary-foreground': '',

    muted: '',
    'muted-foreground': '',

    accent: '',
    'accent-foreground': '',

    destructive: '',
    'destructive-foreground': '',

    border: '',
    input: '',
    ring: '',

    'chart-1': '',
    'chart-2': '',
    'chart-3': '',
    'chart-4': '',
    'chart-5': '',

    sidebar: '',
    'sidebar-foreground': '',
    'sidebar-primary': '',
    'sidebar-primary-foreground': '',
    'sidebar-accent': '',
    'sidebar-accent-foreground': '',
    'sidebar-border': '',
    'sidebar-ring': '',
  },
  darkTokens: {
    background: '',
    foreground: '',

    card: '',
    'card-foreground': '',

    popover: '',
    'popover-foreground': '',

    primary: '',
    'primary-foreground': '',

    secondary: '',
    'secondary-foreground': '',

    muted: '',
    'muted-foreground': '',

    accent: '',
    'accent-foreground': '',

    destructive: '',
    'destructive-foreground': '',

    border: '',
    input: '',
    ring: '',

    sidebar: '',
    'sidebar-foreground': '',
    'sidebar-primary': '',
    'sidebar-primary-foreground': '',
    'sidebar-accent': '',
    'sidebar-accent-foreground': '',
    'sidebar-border': '',
    'sidebar-ring': '',
  },
};

await createFile(
  'index.css.ejs',
  'index.css',
  templatePropsAIMapper('../.context/figma-variables.json', {
    prompt: `
      - Goal: Map Figma variables to strictly named CSS variables provided as input: ${JSON.stringify(cssVariables)}
      - The input will contain a predefined set of CSS variable names.
      - Output format must be:
        {
          "tokens": { ... },
          "tokensDark": { ... }
        }
      - If a variable does not have a dark mode, map the same light mode value to the dark mode.
      - Ensure multi-part values and HSL values are kept exactly as provided.
      - Use zero-like defaults for any missing matches.
    `,
  }),
);
