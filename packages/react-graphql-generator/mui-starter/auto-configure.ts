#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import { readFileSync } from 'fs';
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

  const MUIObject = {
    palette: {
      text: {
        primary: '',
        secondary: '',
        disabled: '',
      },
      primary: {
        main: '',
        light: '',
        dark: '',
        contrastText: '',
      },
      secondary: {
        main: '',
        light: '',
        dark: '',
        contrastText: '',
      },
      background: {
        default: '',
        paper: '',
      },
      action: {
        disabled: '',
        active: '',
        focus: '',
        hover: '',
        activatedOpacity: 1,
        disabledBackground: '',
        focusOpacity: 1,
        selected: '',
        disabledOpacity: 1,
        hoverOpacity: 1,
        selectedOpacity: 1,
      },
      error: {
        main: '',
        light: '',
        dark: '',
        contrastText: '',
      },
      warning: {
        main: '',
        light: '',
        dark: '',
        contrastText: '',
      },
      info: {
        main: '',
        light: '',
        dark: '',
        contrastText: '',
      },
      success: {
        main: '',
        light: '',
        dark: '',
        contrastText: '',
      },
      divider: '',
    },
    breakpoints: {
      values: {
        xs: 444,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    spacing: 8,
    shape: {
      borderRadius: 4,
    },
    typography: {
      fontFamily: 'Roboto',
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      fontSize: 16,
    },
  };

  const figmaVariablesPath = options.figma;
  const figmaVariables = await fs.readFile(figmaVariablesPath, 'utf-8');
  const extractedVariables = flattenFigmaVariables(JSON.parse(figmaVariables));

  const aiResponse = await generateTextWithAI(
    `
          I have these figma variables: ${JSON.stringify(extractedVariables)}
          Map them into a valid MUI v7+ createTheme options object. IMPORTANT this is the format I want as output ${JSON.stringify(MUIObject)}
          
          INSTRUCTIONS:
          - don't include the \`\`\`json prefix, just the actual JSON data
          - return a JSON output ONLY, of the given css variables, and try your best to match all the figma variables to it.
          - ONLY respond with the properties requested given to you, try your best to find a figma variable for each one of them, but don't add more than those.
          - make sure not to use any methods, only concrete values for example (DONT: "spacing": (factor) => factor * 8}px --- DO: "spacing": 4)
          
          DOCS LINKS:
          - https://mui.com/material-ui/customization/palette/
          - https://mui.com/material-ui/customization/typography/
          - https://mui.com/material-ui/customization/spacing/
          - https://mui.com/material-ui/customization/breakpoints/
          - https://mui.com/material-ui/customization/z-index/
          - https://mui.com/material-ui/customization/transitions/
        `,
    AIProvider.OpenAI,
    { maxTokens: 4000 },
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const themeOptions = JSON.parse(aiResponse);

  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const files = await fs.readdir(scriptDir, { recursive: true });
  const ignoreDirectories = new Set(['node_modules', '.turbo', 'dist', '.git']);
  for (const file of files) {
    const segments = file.split(path.sep);
    if (segments.some((seg) => ignoreDirectories.has(seg))) continue;
    if (file.includes('theme.ts.ejs')) {
      const filePath = path.join(scriptDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const renderedContent = ejs.render(content.toString(), { themeOptions });
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
