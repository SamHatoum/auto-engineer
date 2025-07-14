import * as fs from 'fs/promises';
import * as path from 'path';

export class FrontendScaffoldBuilder {
  private starterFiles: Map<string, Buffer> = new Map();

  async cloneStarter(customDesignSystemDir?: string): Promise<this> {
    console.log('Cloning starter project...');
    const starterDir = path.resolve(__dirname, '../react-graphql-starter');
    await this.collectFiles(starterDir, '');

    if (customDesignSystemDir != null && customDesignSystemDir !== '') {
      const atomsDir = path.join(customDesignSystemDir, 'design-system');
      try {
        const stat = await fs.stat(atomsDir);
        if (stat.isDirectory()) {
          const atomsTarget = 'src/components/atoms';
          const files = (await fs.readdir(atomsDir)).filter(f => f.endsWith('.tsx'));
          if (files.length > 0) {
            // Remove all starter atoms from starterFiles
            for (const key of Array.from(this.starterFiles.keys())) {
              if (key.startsWith(atomsTarget + '/')) {
                this.starterFiles.delete(key);
              }
            }
            // Add custom atoms
            for (const file of files) {
              const content = await fs.readFile(path.join(atomsDir, file));
              this.starterFiles.set(path.join(atomsTarget, file), content);
            }
          }
        }
      } catch {
        // If custom design-system doesn't exist, do nothing
      }
    }
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