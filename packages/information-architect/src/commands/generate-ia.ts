import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { processFlowsWithAI } from '../index';
import { type UXSchema } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type GenerateIACommand = Command<
  'GenerateIA',
  {
    outputDir: string;
    flowFiles: string[];
  }
>;

export type IAGeneratedEvent = Event<
  'IAGenerated',
  {
    outputPath: string;
    outputDir: string;
    flowFiles: string[];
  }
>;

export type IAGenerationFailedEvent = Event<
  'IAGenerationFailed',
  {
    error: string;
    outputDir: string;
    flowFiles: string[];
  }
>;

async function getAtomsFromMarkdown(designSystemDir: string): Promise<string[]> {
  const mdPath = path.join(designSystemDir, 'design-system.md');
  let content: string;
  try {
    content = await fs.readFile(mdPath, 'utf-8');
  } catch {
    return [];
  }
  // Find all lines that start with '### ' and extract the component name
  const lines = content.split('\n');
  const components: string[] = [];
  for (const line of lines) {
    const match = line.match(/^###\s+(.+)/);
    if (match) {
      components.push(match[1].trim());
    }
  }
  return components;
}

async function getUniqueSchemaPath(
  outputDir: string,
): Promise<{ filePath: string; existingSchema: object | undefined }> {
  let suffix = 0;
  let existingSchema: object | undefined;

  // First, check if there's an existing ia-scheme file
  const existingFiles = await fs.readdir(outputDir).catch(() => []);
  const iaSchemeFiles = existingFiles.filter((file) => file.match(/^auto-ia-scheme(-\d+)?\.json$/));

  if (iaSchemeFiles.length > 0) {
    // Find the highest numbered file
    const numbers = iaSchemeFiles.map((file) => {
      const match = file.match(/auto-ia-scheme(?:-(\d+))?\.json$/);
      return match && match[1] ? parseInt(match[1], 10) : 0;
    });
    const highestNumber = Math.max(...numbers);

    // Read the highest numbered file as the existing schema
    const existingFile = highestNumber === 0 ? 'auto-ia-scheme.json' : `auto-ia-scheme-${highestNumber}.json`;
    const existingPath = path.join(outputDir, existingFile);
    try {
      const content = await fs.readFile(existingPath, 'utf-8');
      existingSchema = JSON.parse(content) as object;
    } catch {
      // If we can't read/parse it, treat as no existing schema
    }

    // New file will be one number higher
    suffix = highestNumber + 1;
  }

  const filePath =
    suffix === 0 ? path.join(outputDir, 'auto-ia-scheme.json') : path.join(outputDir, `auto-ia-scheme-${suffix}.json`);

  return { filePath, existingSchema };
}

export async function handleGenerateIACommand(
  command: GenerateIACommand,
): Promise<IAGeneratedEvent | IAGenerationFailedEvent> {
  const { outputDir, flowFiles } = command.data;

  try {
    // Load UX schema
    const uxSchemaPath = path.join(__dirname, '..', 'auto-ux-schema.json');
    const uxSchemaContent = await fs.readFile(uxSchemaPath, 'utf-8');
    const uxSchema = JSON.parse(uxSchemaContent) as UXSchema;

    // Read all flow files
    const flows: string[] = await Promise.all(flowFiles.map((flow: string) => fs.readFile(flow, 'utf-8')));

    // Get unique schema path and existing schema
    const { filePath, existingSchema } = await getUniqueSchemaPath(outputDir);

    // Get atoms from markdown
    const atomNames = await getAtomsFromMarkdown(outputDir);
    const atoms = atomNames.map((name) => ({ name, props: [] }));

    // Generate IA schema using AI
    const iaSchema = await processFlowsWithAI(flows, uxSchema, existingSchema, atoms);

    // Write the schema to file
    await fs.writeFile(filePath, JSON.stringify(iaSchema, null, 2));
    console.log(`Generated IA schema written to ${filePath}`);

    return {
      type: 'IAGenerated',
      data: {
        outputPath: filePath,
        outputDir,
        flowFiles,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to generate IA schema:', error);

    return {
      type: 'IAGenerationFailed',
      data: {
        error: errorMessage,
        outputDir,
        flowFiles,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const generateIACommandHandler: CommandHandler<GenerateIACommand> = {
  name: 'GenerateIA',
  handle: async (command: GenerateIACommand): Promise<void> => {
    const result = await handleGenerateIACommand(command);
    if (result.type === 'IAGenerated') {
      console.log('IA schema generated successfully');
    } else {
      console.error(`Failed: ${result.data.error}`);
    }
  },
};
