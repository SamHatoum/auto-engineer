#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import * as path from 'path';
import ejs from 'ejs';
import { program } from 'commander';
import { AIProvider, generateTextWithAI } from '@auto-engineer/ai-gateway';
import { flattenFigmaVariables } from '@auto-engineer/react-graphql-generator';

program.option('--figma <path>', 'Path to Figma variables JSON').parse(process.argv);

const options = program.opts<{ figma: string }>();

async function configure() {
  if (!options.figma) {
    console.error('Error: --figma option is required');
    process.exit(1);
  }

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

  const figmaVariablesPath = options.figma;
  const figmaVariables = await fs.readFile(figmaVariablesPath, 'utf-8');
  const extractedVariables = flattenFigmaVariables(JSON.parse(figmaVariables));

  const aiResponse = await generateTextWithAI(
    `
      I have these strictly named css variables: ${JSON.stringify(cssVariables)}
      I also have these figma variables: ${JSON.stringify(extractedVariables)}

      INSTRUCTIONS:
      - don't include the \`\`\`json prefix, just the actual JSON data
      - return a JSON output ONLY, of the given css variables, and try your best to match all the figma variables to it.
      - if there is not a match make sure to reset that value to a zero-like value.
      - if the variable doesn't have a dark mode, map the same light mode to the dark mode as well.
      - IMPORTANT: some of these given values are in hsl format, don't modify them, and make sure you always assign the value of the tokens as given to you. Sometimes values can consist of more that one value like this: 48 100% 50%
      - return in the format:
      {
        "tokens": { ... },
        "tokensDark": { ... }
      }
    `,
    AIProvider.OpenAI,
    { maxTokens: 4000 },
  );

  const { tokens, tokensDark } = JSON.parse(aiResponse) as { tokens: object; tokensDark: object };

  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const files = await fs.readdir(scriptDir, { recursive: true });
  const ignoreDirectories = new Set(['node_modules', '.turbo', 'dist', '.git']);
  for (const file of files) {
    const segments = file.split(path.sep);
    if (segments.some((seg) => ignoreDirectories.has(seg))) continue;
    if (file.includes('index.css.ejs')) {
      const filePath = path.join(scriptDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const renderedContent = ejs.render(content, { tokens, tokensDark });
      const targetPath = filePath.slice(0, -4);
      await fs.writeFile(targetPath, renderedContent);
      await fs.unlink(filePath);
    }
  }

  console.log('Configuration complete.');
}

configure().catch((error) => {
  console.error('Configuration failed:', error);
  process.exit(1);
});
