import * as fs from 'fs/promises';
import * as path from 'path';
import createDebug from 'debug';

const debug = createDebug('auto:frontend-generator-react-graphql:builder');
const debugFiles = createDebug('auto:frontend-generator-react-graphql:builder:files');
const debugBuild = createDebug('auto:frontend-generator-react-graphql:builder:build');

export class FrontendScaffoldBuilder {
  private starterFiles: Map<string, Buffer> = new Map();

  async cloneStarter(_starterDir: string): Promise<this> {
    debug('Cloning starter from: %s', _starterDir);
    // If the path is already absolute, use it as is, otherwise resolve relative to current working directory
    const starterDir = path.isAbsolute(_starterDir) ? _starterDir : path.resolve(process.cwd(), _starterDir);
    debug('Resolved starter directory: %s', starterDir);
    await this.collectFiles(starterDir, '');
    debug('Starter files collected: %d files', this.starterFiles.size);
    return this;
  }

  private async collectFiles(dir: string, relative: string) {
    debugFiles('Collecting files from: %s (relative: %s)', dir, relative || '/');
    const entries = await fs.readdir(dir, { withFileTypes: true });
    debugFiles('Found %d entries in directory', entries.length);

    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      const relPath = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        debugFiles('Entering directory: %s', relPath);
        await this.collectFiles(absPath, relPath);
      } else if (entry.isFile()) {
        // Skip JavaScript files and map files everywhere - only copy TypeScript and other non-JS files
        const normalizedPath = relPath.replace(/\\/g, '/');
        if (normalizedPath.endsWith('.js') || normalizedPath.endsWith('.js.map')) {
          debugFiles('Skipping JS/map file: %s', relPath);
          continue;
        }
        const content = await fs.readFile(absPath);
        this.starterFiles.set(relPath, content);
        debugFiles('Added file: %s (%d bytes)', relPath, content.length);
      }
    }
  }

  // async configureStarter(variablesDir: string): Promise<void> {
  //   for (const [relPath, content] of Array.from(this.starterFiles.entries())) {
  //     if (relPath.endsWith('.ejs')) {
  //       const targetPath = relPath.slice(0, -4);
  //       const cssVariables = {
  //         tokens: {
  //           radius: '0.5rem',
  //
  //           background: '',
  //           foreground: '',
  //
  //           card: '',
  //           'card-foreground': '',
  //
  //           popover: '',
  //           'popover-foreground': '',
  //
  //           primary: '',
  //           'primary-foreground': '',
  //
  //           secondary: '',
  //           'secondary-foreground': '',
  //
  //           muted: '',
  //           'muted-foreground': '',
  //
  //           accent: '',
  //           'accent-foreground': '',
  //
  //           destructive: '',
  //           'destructive-foreground': '',
  //
  //           border: '',
  //           input: '',
  //           ring: '',
  //
  //           'chart-1': '',
  //           'chart-2': '',
  //           'chart-3': '',
  //           'chart-4': '',
  //           'chart-5': '',
  //
  //           sidebar: '',
  //           'sidebar-foreground': '',
  //           'sidebar-primary': '',
  //           'sidebar-primary-foreground': '',
  //           'sidebar-accent': '',
  //           'sidebar-accent-foreground': '',
  //           'sidebar-border': '',
  //           'sidebar-ring': '',
  //         },
  //         darkTokens: {
  //           background: '',
  //           foreground: '',
  //
  //           card: '',
  //           'card-foreground': '',
  //
  //           popover: '',
  //           'popover-foreground': '',
  //
  //           primary: '',
  //           'primary-foreground': '',
  //
  //           secondary: '',
  //           'secondary-foreground': '',
  //
  //           muted: '',
  //           'muted-foreground': '',
  //
  //           accent: '',
  //           'accent-foreground': '',
  //
  //           destructive: '',
  //           'destructive-foreground': '',
  //
  //           border: '',
  //           input: '',
  //           ring: '',
  //
  //           sidebar: '',
  //           'sidebar-foreground': '',
  //           'sidebar-primary': '',
  //           'sidebar-primary-foreground': '',
  //           'sidebar-accent': '',
  //           'sidebar-accent-foreground': '',
  //           'sidebar-border': '',
  //           'sidebar-ring': '',
  //         },
  //       };
  //
  //       const figmaVariables = readFileSync(variablesDir, 'utf-8');
  //       const extractedVariables = flattenFigmaVariables(JSON.parse(figmaVariables));
  //
  //       console.log(JSON.stringify(extractedVariables, null, 2));
  //       // return
  //
  //       const aiResponse = await generateTextWithAI(
  //         `
  //         I have these strictly named css variables: ${JSON.stringify(cssVariables)}
  //         I also have these figma variables: ${JSON.stringify(extractedVariables)}
  //
  //         INSTRUCTIONS:
  //         - don't include the \`\`\`json prefix, just the actual JSON data
  //         - return a JSON output ONLY, of the given css variables, and try your best to match all the figma variables to it.
  //         - if there is not a match make sure to reset that value to a zero-like value.
  //         - if the variable doesn't have a dark mode, map the same light mode to the dark mode as well.
  //         - IMPORTANT: some of these given values are in hsl format, don't modify them, and make sure you always assign the value of the tokens as given to you. Sometimes values can consist of more that one value like this: 48 100% 50%
  //         - return in the format:
  //         {
  //           "tokens": { ... },
  //           "tokensDark": { ... }
  //         }
  //       `,
  //         undefined,
  //         { maxTokens: 4000 },
  //       );
  //
  //       console.log('Ai Response', JSON.stringify(aiResponse, null, 2));
  //
  //       const { tokens, tokensDark } = JSON.parse(aiResponse) as { tokens: object; tokensDark: object };
  //
  //       const renderedContent = ejs.render(content.toString(), { tokens, tokensDark });
  //
  //       this.starterFiles.set(targetPath, Buffer.from(renderedContent));
  //
  //       this.starterFiles.delete(relPath);
  //     }
  //   }
  // }

  async build(outputDir: string): Promise<void> {
    debugBuild('Building to output directory: %s', outputDir);
    if (!this.starterFiles.size) {
      debugBuild('ERROR: No starter files loaded');
      throw new Error('Starter files not loaded. Call cloneStarter() first.');
    }

    debugBuild('Clearing existing output directory if it exists: %s', outputDir);
    await fs.rm(outputDir, { recursive: true, force: true });
    debugBuild('Output directory cleared');

    debugBuild('Creating output directory: %s', outputDir);
    await fs.mkdir(outputDir, { recursive: true });

    debugBuild('Writing %d files to output', this.starterFiles.size);
    let filesWritten = 0;
    for (const [relPath, content] of this.starterFiles.entries()) {
      const outPath = path.join(outputDir, relPath);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, content);
      filesWritten++;
      debugBuild('Written file %d/%d: %s', filesWritten, this.starterFiles.size, relPath);
    }

    debugBuild('Build complete - %d files written', filesWritten);
    debugBuild('Build complete. Output at: %s', outputDir);
  }
}
