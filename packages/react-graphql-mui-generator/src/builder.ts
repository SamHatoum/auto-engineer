import * as fs from 'fs/promises';
import * as path from 'path';
import ejs from 'ejs';
import { AIProvider, generateTextWithAI } from '@auto-engineer/ai-gateway';
import { flattenFigmaVariables } from './figma-helpers';

export class FrontendScaffoldBuilder {
  private starterFiles: Map<string, Buffer> = new Map();

  async cloneStarter(_starterDir: string): Promise<this> {
    const starterDir = path.resolve(__dirname, _starterDir);
    await this.collectFiles(starterDir, '');
    return this;
  }

  private async collectFiles(dir: string, relative: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      const relPath = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        await this.collectFiles(absPath, relPath);
      } else if (entry.isFile()) {
        const content = await fs.readFile(absPath);
        this.starterFiles.set(relPath, content);
      }
    }
  }

  async configureStarter(variablesDir: string): Promise<void> {
    for (const [relPath, content] of Array.from(this.starterFiles.entries())) {
      if (relPath.endsWith('.ejs') && relPath.includes('theme.ts')) {
        const targetPath = relPath.slice(0, -4);

        const filePath = path.resolve(__dirname, variablesDir);
        const figmaVariables = await fs.readFile(filePath, 'utf-8');
        const extractedVariables = flattenFigmaVariables(JSON.parse(figmaVariables));

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

        // console.log(JSON.stringify(extractedVariables, null, 2));
        // return

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

        console.log(JSON.stringify(aiResponse, null, 2));

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const themeOptions = JSON.parse(aiResponse);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const renderedContent = ejs.render(content.toString(), { themeOptions });

        this.starterFiles.set(targetPath, Buffer.from(renderedContent));

        this.starterFiles.delete(relPath);
      }
    }
  }

  async build(outputDir: string): Promise<void> {
    if (!this.starterFiles.size) {
      throw new Error('Starter files not loaded. Call cloneStarter() first.');
    }
    await fs.mkdir(outputDir, { recursive: true });
    for (const [relPath, content] of this.starterFiles.entries()) {
      const outPath = path.join(outputDir, relPath);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, content);
    }
    console.log(`Build complete. Output at: ${outputDir}`);
  }
}
