import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { processFlowsWithAI } from '../index';
import { type UXSchema } from '../types';
import createDebug from 'debug';

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
  debugFiles('Finding unique schema path in: %s', outputDir);
  let suffix = 0;
  let existingSchema: object | undefined;

  // First, check if there's an existing ia-scheme file
  const existingFiles = await fs.readdir(outputDir).catch(() => []);
  debugFiles('Found %d files in output directory', existingFiles.length);

  const iaSchemeFiles = existingFiles.filter((file) => file.match(/^auto-ia-scheme(-\d+)?\.json$/));
  debugFiles('Found %d existing IA scheme files', iaSchemeFiles.length);

  if (iaSchemeFiles.length > 0) {
    // Find the highest numbered file
    const numbers = iaSchemeFiles.map((file) => {
      const match = file.match(/auto-ia-scheme(?:-(\d+))?\.json$/);
      const num = match && match[1] ? parseInt(match[1], 10) : 0;
      debugFiles('  File %s -> number %d', file, num);
      return num;
    });
    const highestNumber = Math.max(...numbers);
    debugFiles('Highest numbered file: %d', highestNumber);

    // Read the highest numbered file as the existing schema
    const existingFile = highestNumber === 0 ? 'auto-ia-scheme.json' : `auto-ia-scheme-${highestNumber}.json`;
    const existingPath = path.join(outputDir, existingFile);
    debugFiles('Reading existing schema from: %s', existingPath);

    try {
      const content = await fs.readFile(existingPath, 'utf-8');
      existingSchema = JSON.parse(content) as object;
      debugFiles('Existing schema loaded successfully');
    } catch (error) {
      debugFiles('Could not read/parse existing schema: %O', error);
      // If we can't read/parse it, treat as no existing schema
    }

    // New file will be one number higher
    suffix = highestNumber + 1;
    debugFiles('New file will use suffix: %d', suffix);
  }

  const filePath =
    suffix === 0 ? path.join(outputDir, 'auto-ia-scheme.json') : path.join(outputDir, `auto-ia-scheme-${suffix}.json`);

  debugFiles('New schema will be written to: %s', filePath);
  debugFiles('Existing schema found: %s', existingSchema ? 'yes' : 'no');

  return { filePath, existingSchema };
}

export async function handleGenerateIACommand(
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
    const result = await handleGenerateIACommand(command);
    if (result.type === 'IAGenerated') {
      console.log('IA schema generated successfully');
    } else {
      console.error(`Failed: ${result.data.error}`);
    }
  },
};
