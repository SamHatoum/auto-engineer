import { AIAgentOutput } from './types';
import { AIAgent } from './ai-agent';
import * as fs from 'fs/promises';
import * as path from 'path';
import uxSchema from './auto-ux-schema.json';

export class FrontendScaffoldBuilder {
  private uxSchemaOutput: AIAgentOutput | null = null;
  private aiAgent: AIAgent;
  private starterFiles: Map<string, Buffer> = new Map();

  constructor() {
    this.aiAgent = new AIAgent();
  }

  async cloneStarter(): Promise<this> {
    console.log('Cloning starter project...');
    const starterDir = path.resolve(__dirname, '../react-graphql-starter');
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

  async processFlowsWithAI(flows: string[]): Promise<this> {
    try {
      this.uxSchemaOutput = await this.aiAgent.generateUXComponents(flows, uxSchema);
      console.log('Processed flows with AI agent', this.uxSchemaOutput);
      console.log('Number of flows processed:', flows.length);
      console.log('UX Schema title:', uxSchema.title);
      return this;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error processing flows:', error.message);
      } else {
        console.error('An unknown error occurred while processing flows');
      }
      throw error;
    }
  }

  getUXSchemaOutput(): AIAgentOutput | null {
    return this.uxSchemaOutput;
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

    if (this.uxSchemaOutput) {
      const schemaPath = path.join(outputDir, 'auto-ia-scheme.json');
      await fs.writeFile(schemaPath, JSON.stringify(this.uxSchemaOutput, null, 2));
    }
    console.log(`Build complete. Output at: ${outputDir}`);
  }
}