import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { processFlowsWithAI } from '../index';
import { type UXSchema } from '../types';
import createDebug from 'debug';
import fg from 'fast-glob';

const debug = createDebug('ia:generate-command');
const debugSchema = createDebug('ia:generate-command:schema');
const debugFiles = createDebug('ia:generate-command:files');
const debugAtoms = createDebug('ia:generate-command:atoms');
const debugResult = createDebug('ia:generate-command:result');

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
  debugAtoms('Looking for design-system.md at: %s', mdPath);

  let content: string;
  try {
    content = await fs.readFile(mdPath, 'utf-8');
    debugAtoms('Design system markdown loaded, size: %d bytes', content.length);
  } catch (error) {
    debugAtoms('Could not read design-system.md: %O', error);
    return [];
  }
  // Find all lines that start with '### ' and extract the component name
  const lines = content.split('\n');
  const components: string[] = [];
  debugAtoms('Scanning %d lines for component names', lines.length);

  for (const line of lines) {
    const match = line.match(/^###\s+(.+)/);
    if (match) {
      const componentName = match[1].trim();
      components.push(componentName);
      debugAtoms('  Found component: %s', componentName);
    }
  }

  debugAtoms('Total components found: %d', components.length);
  return components;
}

async function getUniqueSchemaPath(
  outputDir: string,
): Promise<{ filePath: string; existingSchema: object | undefined }> {
  debugFiles('Finding schema path in: %s', outputDir);
  let existingSchema: object | undefined;

  // Always use the same filename - overwrite if it exists
  const filePath = path.join(outputDir, 'auto-ia-scheme.json');
  debugFiles('Schema will be written to: %s', filePath);

  // Try to read existing schema if it exists
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    existingSchema = JSON.parse(content) as object;
    debugFiles('Existing schema loaded successfully from: %s', filePath);
  } catch {
    debugFiles('No existing schema found at: %s', filePath);
    // If we can't read/parse it, treat as no existing schema
  }

  debugFiles('Existing schema found: %s', existingSchema ? 'yes' : 'no');

  return { filePath, existingSchema };
}

async function handleGenerateIACommandInternal(
  command: GenerateIACommand,
): Promise<IAGeneratedEvent | IAGenerationFailedEvent> {
  const { outputDir, flowFiles } = command.data;

  debug('Handling GenerateIA command');
  debug('  Output directory: %s', outputDir);
  debug('  Flow files: %d', flowFiles.length);
  debug('  Request ID: %s', command.requestId);
  debug('  Correlation ID: %s', command.correlationId ?? 'none');

  try {
    // Load UX schema
    const uxSchemaPath = path.join(__dirname, '..', 'auto-ux-schema.json');
    debugSchema('Loading UX schema from: %s', uxSchemaPath);

    const uxSchemaContent = await fs.readFile(uxSchemaPath, 'utf-8');
    const uxSchema = JSON.parse(uxSchemaContent) as UXSchema;
    debugSchema('UX schema loaded successfully');

    // Read all flow files
    debugFiles('Reading %d flow files', flowFiles.length);
    const flows: string[] = await Promise.all(
      flowFiles.map(async (flow: string) => {
        debugFiles('  Reading: %s', flow);
        const content = await fs.readFile(flow, 'utf-8');
        debugFiles('    Size: %d bytes', content.length);
        return content;
      }),
    );
    debugFiles('All flow files read successfully');

    // Get unique schema path and existing schema
    const { filePath, existingSchema } = await getUniqueSchemaPath(outputDir);

    // Get atoms from markdown
    debugAtoms('Getting atoms from markdown in: %s', outputDir);
    const atomNames = await getAtomsFromMarkdown(outputDir);
    const atoms = atomNames.map((name) => ({ name, props: [] }));
    debugAtoms('Created %d atom definitions', atoms.length);

    // Generate IA schema using AI
    debug('Processing flows with AI...');
    debug('  Flow count: %d', flows.length);
    debug('  Existing schema: %s', existingSchema ? 'yes' : 'no');
    debug('  Atom count: %d', atoms.length);

    const iaSchema = await processFlowsWithAI(flows, uxSchema, existingSchema, atoms);
    debug('AI processing complete');

    // Write the schema to file
    debugResult('Writing IA schema to: %s', filePath);
    const schemaJson = JSON.stringify(iaSchema, null, 2);
    debugResult('Schema JSON size: %d bytes', schemaJson.length);

    await fs.writeFile(filePath, schemaJson);
    debugResult('Schema written successfully');
    console.log(`Generated IA schema written to ${filePath}`);

    const successEvent: IAGeneratedEvent = {
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

    debugResult('Returning success event: IAGenerated');
    debugResult('  Output path: %s', filePath);
    return successEvent;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug('ERROR: Failed to generate IA schema: %O', error);
    console.error('Failed to generate IA schema:', error);

    const failureEvent: IAGenerationFailedEvent = {
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

    debugResult('Returning failure event: IAGenerationFailed');
    debugResult('  Error: %s', errorMessage);
    return failureEvent;
  }
}

export const generateIACommandHandler: CommandHandler<GenerateIACommand> = {
  name: 'GenerateIA',
  handle: async (command: GenerateIACommand): Promise<void> => {
    const result = await handleGenerateIACommandInternal(command);
    if (result.type === 'IAGenerated') {
      console.log('IA schema generated successfully');
    } else {
      console.error(`Failed: ${result.data.error}`);
    }
  },
};

// CLI arguments interface
interface CliArgs {
  _: string[];
  [key: string]: unknown;
}

// Helper function to expand glob patterns
async function expandGlobPatterns(patterns: string[]): Promise<string[]> {
  const expandedFiles: string[] = [];
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      // This is a glob pattern, expand it
      const matches = await fg(pattern);
      expandedFiles.push(...matches);
    } else {
      expandedFiles.push(pattern);
    }
  }
  return expandedFiles;
}

// Helper function to parse from message bus format
async function parseFromMessageBus(data: { outputDir?: string; flowFiles?: string[] }): Promise<GenerateIACommand> {
  const outputDir = data.outputDir ?? '.context';
  const flowFiles = data.flowFiles ?? [];

  // If no flow files provided, use default pattern
  const resolvedFlowFiles = flowFiles.length > 0 ? flowFiles : ['flows/*.flow.ts'];

  // Expand glob patterns if necessary
  const expandedFlowFiles = await expandGlobPatterns(resolvedFlowFiles);

  return {
    type: 'GenerateIA',
    data: {
      outputDir,
      flowFiles: expandedFlowFiles,
    },
    timestamp: new Date(),
  };
}

// Helper function to parse CLI arguments
async function parseCliArgs(cliArgs: CliArgs): Promise<GenerateIACommand> {
  // Handle case where command comes from message bus with data already structured
  if ('data' in cliArgs && typeof cliArgs.data === 'object' && cliArgs.data !== null) {
    return parseFromMessageBus(cliArgs.data as { outputDir?: string; flowFiles?: string[] });
  }

  // Handle traditional CLI arguments with _ array
  const outputDir = cliArgs._?.[0] ?? '.context';
  // All remaining arguments are flow files
  const flowFiles = cliArgs._ !== undefined ? cliArgs._.slice(1) : [];

  // If no flow files provided, use default pattern
  const resolvedFlowFiles = flowFiles.length > 0 ? flowFiles : ['flows/*.flow.ts'];

  // Expand glob patterns if necessary
  const expandedFlowFiles = await expandGlobPatterns(resolvedFlowFiles);

  return {
    type: 'GenerateIA',
    data: {
      outputDir,
      flowFiles: expandedFlowFiles,
    },
    timestamp: new Date(),
  };
}

// Type guard to check if it's a GenerateIACommand
function isGenerateIACommand(obj: unknown): obj is GenerateIACommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'data' in obj &&
    ((obj as { type: unknown }).type === 'GenerateIA' || (obj as { type: unknown }).type === 'generate:ia')
  );
}

// Default export for CLI usage
export default async (commandOrArgs: GenerateIACommand | CliArgs) => {
  let command: GenerateIACommand;

  if (isGenerateIACommand(commandOrArgs)) {
    // Normalize the type if it comes from message bus
    if ((commandOrArgs as { type: string }).type === 'generate:ia') {
      command = {
        ...commandOrArgs,
        type: 'GenerateIA' as const,
      };
    } else {
      command = commandOrArgs;
    }
  } else if ('outputDir' in commandOrArgs && 'flowFiles' in commandOrArgs) {
    // Handle message bus format with outputDir and flowFiles
    command = await parseFromMessageBus(commandOrArgs as { outputDir?: string; flowFiles?: string[] });
  } else {
    command = await parseCliArgs(commandOrArgs);
  }

  const result = await handleGenerateIACommandInternal(command);
  if (result.type === 'IAGenerated') {
    console.log('IA schema generated successfully');
  } else {
    console.error(`Failed: ${result.data.error}`);
  }
};
