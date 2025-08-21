import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import ejs from 'ejs';
import { AIProvider, generateTextWithAI } from '@auto-engineer/ai-gateway';
import { flattenFigmaVariables } from './figma-helpers';

export class FrontendScaffoldBuilder {
  private starterFiles: Map<string, Buffer> = new Map();

  async cloneStarter(_starterDir: string): Promise<this> {
    // If the path is already absolute, use it as is, otherwise resolve relative to __dirname
    const starterDir = path.isAbsolute(_starterDir) ? _starterDir : path.resolve(__dirname, _starterDir);
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
      if (relPath.endsWith('.ejs')) {
        const targetPath = relPath.slice(0, -4);
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

        const filePath = path.resolve(__dirname, variablesDir);
        const figmaVariables = await fs.readFile(filePath, 'utf-8');
        const extractedVariables = flattenFigmaVariables(JSON.parse(figmaVariables));

        console.log(JSON.stringify(extractedVariables, null, 2));
        // return

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

        console.log('Ai Response', JSON.stringify(aiResponse, null, 2));

        const { tokens, tokensDark } = JSON.parse(aiResponse) as { tokens: object; tokensDark: object };

        const renderedContent = ejs.render(content.toString(), { tokens, tokensDark });

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
