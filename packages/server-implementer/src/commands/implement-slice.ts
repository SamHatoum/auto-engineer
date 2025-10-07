import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import { generateTextWithAI } from '@auto-engineer/ai-gateway';
import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import fg from 'fast-glob';
import createDebug from 'debug';

const debug = createDebug('auto:server-implementer:slice');
const debugHandler = createDebug('auto:server-implementer:slice:handler');
const debugProcess = createDebug('auto:server-implementer:slice:process');
const debugResult = createDebug('auto:server-implementer:slice:result');

export type ImplementSliceCommand = Command<
  'ImplementSlice',
  {
    slicePath: string;
    context?: {
      previousOutputs?: string;
      attemptNumber?: number;
    };
  }
>;

export type SliceImplementedEvent = Event<
  'SliceImplemented',
  {
    slicePath: string;
    filesImplemented: string[];
  }
>;

export type SliceImplementationFailedEvent = Event<
  'SliceImplementationFailed',
  {
    slicePath: string;
    error: string;
  }
>;

export type ImplementSliceEvents = SliceImplementedEvent | SliceImplementationFailedEvent;

export const commandHandler = defineCommandHandler<
  ImplementSliceCommand,
  (command: ImplementSliceCommand) => Promise<SliceImplementedEvent | SliceImplementationFailedEvent>
>({
  name: 'ImplementSlice',
  alias: 'implement:slice',
  description: 'AI implements a specific server slice',
  category: 'implement',
  icon: 'layers',
  fields: {
    slicePath: {
      description: 'Path to the slice directory to implement',
      required: true,
    },
    context: {
      description: 'Context for retry attempts with previous outputs',
      required: false,
    },
  },
  examples: [
    '$ auto implement:slice --slice-path=./server/src/domain/flows/seasonal-assistant/enters-shopping-criteria-into-assistant',
  ],
  events: ['SliceImplemented', 'SliceImplementationFailed'],
  handle: async (command: ImplementSliceCommand): Promise<SliceImplementedEvent | SliceImplementationFailedEvent> => {
    debug('CommandHandler executing for ImplementSlice');
    const result = await handleImplementSliceCommand(command);

    if (result.type === 'SliceImplemented') {
      debug('Command handler completed: success');
      debug('✅ Slice implementation completed successfully');
      debug('   Slice: %s', path.basename(result.data.slicePath));
      debug('   Files implemented: %d', result.data.filesImplemented.length);
    } else {
      debug('Command handler completed: failure - %s', result.data.error);
      debug('❌ Slice implementation failed: %s', result.data.error);
    }
    return result;
  },
});

// Helper function to extract code block from AI response
function extractCodeBlock(text: string): string {
  return text
    .replace(/```(?:ts|typescript)?/g, '')
    .replace(/```/g, '')
    .trim();
}

// Load all TypeScript files from the slice directory
async function loadContextFiles(sliceDir: string): Promise<Record<string, string>> {
  const files = await fg(['*.ts'], { cwd: sliceDir });
  const context: Record<string, string> = {};
  for (const file of files) {
    const absPath = path.join(sliceDir, file);
    context[file] = await readFile(absPath, 'utf-8');
  }
  return context;
}

const IMPLEMENTATION_MARKER = '// @auto-implement';

function hasImplementationMarker(content: string): boolean {
  return content.includes(IMPLEMENTATION_MARKER);
}

function addImplementationMarker(content: string): string {
  if (hasImplementationMarker(content)) {
    return content;
  }
  return `${IMPLEMENTATION_MARKER}\n${content}`;
}

function needsImplementation(content: string): boolean {
  return (
    hasImplementationMarker(content) || content.includes('TODO:') || content.includes('IMPLEMENTATION INSTRUCTIONS')
  );
}

function findFilesToImplement(contextFiles: Record<string, string>): Array<[string, string]> {
  return Object.entries(contextFiles).filter(([, content]) => hasImplementationMarker(content));
}

// System prompt for AI implementation
const SYSTEM_PROMPT = `
You are a software engineer implementing missing logic in a sliced event-driven TypeScript server. Each slice contains partially scaffolded code, and your task is to complete the logic following implementation instructions embedded in each file.

Project Characteristics:
- Architecture: sliced event-sourced CQRS (Command, Query, Reaction slices)
- Language: TypeScript with type-graphql and @event-driven-io/emmett
- Each slice has scaffolded files with implementation instructions clearly marked with comments (e.g., '## IMPLEMENTATION INSTRUCTIONS ##') or TODOs.
- Tests (e.g., *.specs.ts) must pass.
- Type errors are not allowed.

Your Goal:
- Read the implementation instructions from the provided file.
- Generate only the code needed to fulfill the instructions, nothing extra and provide back the whole file without the instructions.
- Maintain immutability and adhere to functional best practices.
- Use only the types and domain constructs already present in the slice.
- Do not remove existing imports or types that are still referenced or required in the file.
- Preserve index signatures like [key: string]: unknown as they are required for TypeScript compatibility.
- Return the entire updated file, not just the modified parts and remove any TODO comments or instructions after implementing the logic

Key rules:
- Never modify code outside the TODO or instruction areas.
- Ensure the code is production-ready and type-safe.
- Follow the slice type conventions:
  - **Command slice**: validate command, inspect state, emit events, never mutate state. Uses graphql mutations.
  - **Reaction slice**: respond to events with commands.
  - **Query slice**: maintain projections based on events, do not emit or throw. Uses graphql queries.
- All code must be TypeScript compliant and follow functional patterns.
- If a test exists, make it pass.
- Keep implementations minimal and idiomatic.

Avoid:
- Adding new dependencies.
- Refactoring unrelated code.
- Changing the structure of already scaffolded files unless instructed.

You will receive:
- The path of the file to implement.
- The current contents of the file, with instruction comments.
- Other relevant files from the same slice (e.g., types, test, state, etc.).

You must:
-  Return the entire updated file (no commentary and remove all implementation instructions).
- Ensure the output is valid TypeScript.
`;

function buildInitialPrompt(targetFile: string, context: Record<string, string>): string {
  return `
${SYSTEM_PROMPT}

---
📄 Target file to implement: ${targetFile}

${context[targetFile]}

---
🧠 Other files in the same slice:
${Object.entries(context)
  .filter(([name]) => name !== targetFile)
  .map(([name, content]) => `// File: ${name}\n${content}`)
  .join('\n\n')}

---
Return only the whole updated file of ${targetFile}. Do not remove existing imports or types that are still referenced or required in the file. The file returned has to be production ready.
`.trim();
}

function buildRetryPrompt(targetFile: string, context: Record<string, string>, previousOutputs: string): string {
  return `
${SYSTEM_PROMPT}

---
The previous implementation needs adjustment based on this feedback:

${previousOutputs}

📄 File to update: ${targetFile}

${context[targetFile]}

🧠 Other files in the same slice:
${Object.entries(context)
  .filter(([name]) => name !== targetFile)
  .map(([name, content]) => `// File: ${name}\n${content}`)
  .join('\n\n')}

---
Return only the corrected full contents of ${targetFile}, no commentary, no markdown.
`.trim();
}

async function addMarkersToFiles(slicePath: string, contextFiles: Record<string, string>): Promise<void> {
  const filesToMark = Object.entries(contextFiles).filter(([, content]) => needsImplementation(content));
  debugProcess(`Found ${filesToMark.length} files needing implementation markers`);

  for (const [filename, content] of filesToMark) {
    if (!hasImplementationMarker(content)) {
      const markedContent = addImplementationMarker(content);
      await writeFile(path.join(slicePath, filename), markedContent, 'utf-8');
      contextFiles[filename] = markedContent;
      debugProcess(`Added implementation marker to ${filename}`);
    }
  }
}

async function implementFile(
  slicePath: string,
  targetFile: string,
  contextFiles: Record<string, string>,
  retryContext?: { previousOutputs?: string; attemptNumber?: number },
): Promise<void> {
  debugProcess(`Implementing ${targetFile}`);

  const previousOutputs = retryContext?.previousOutputs;
  const isRetry = previousOutputs !== undefined && previousOutputs.length > 0;
  const prompt = isRetry
    ? buildRetryPrompt(targetFile, contextFiles, previousOutputs)
    : buildInitialPrompt(targetFile, contextFiles);

  if (isRetry) {
    debugProcess(`Using retry prompt for attempt #${retryContext?.attemptNumber ?? 2}`);
  }

  const aiOutput = await generateTextWithAI(prompt);
  let cleanedCode = extractCodeBlock(aiOutput);
  cleanedCode = addImplementationMarker(cleanedCode);

  const filePath = path.join(slicePath, targetFile);
  await writeFile(filePath, cleanedCode, 'utf-8');
  debugProcess(`Successfully implemented ${targetFile}`);

  contextFiles[targetFile] = cleanedCode;
}

async function implementSlice(
  slicePath: string,
  context?: { previousOutputs?: string; attemptNumber?: number },
): Promise<{ success: boolean; filesImplemented: string[]; error?: string }> {
  const sliceName = path.basename(slicePath);

  debugProcess(`Implementing slice: ${sliceName}`);

  try {
    const contextFiles = await loadContextFiles(slicePath);
    debugProcess(`Loaded ${Object.keys(contextFiles).join(', ')} files from slice`);

    await addMarkersToFiles(slicePath, contextFiles);

    const filesToImplement = findFilesToImplement(contextFiles);
    debugProcess(`Found ${filesToImplement.length} files with markers to implement`);

    if (filesToImplement.length === 0) {
      debugProcess('No files with markers found');
      return { success: true, filesImplemented: [] };
    }

    const implementedFiles: string[] = [];
    for (const [targetFile] of filesToImplement) {
      await implementFile(slicePath, targetFile, contextFiles, context);
      implementedFiles.push(targetFile);
    }

    return { success: true, filesImplemented: implementedFiles };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    debugProcess(`Implementation failed: ${errorMessage}`);
    return { success: false, filesImplemented: [], error: errorMessage };
  }
}

function logCommandDebugInfo(command: ImplementSliceCommand, resolvedSlicePath?: string): void {
  const rawData = command.data as ImplementSliceCommand['data'] & { path?: string };
  const slicePath = rawData.slicePath ?? rawData.path;
  const { context } = command.data;
  debug('Handling ImplementSliceCommand');
  debug('  Slice path: %s', resolvedSlicePath ?? slicePath);
  debug('  Context provided: %s', context ? 'yes' : 'no');
  if (context) {
    debug('  Attempt number: %d', context.attemptNumber ?? 1);
  }
  debug('  Request ID: %s', command.requestId);
  debug('  Correlation ID: %s', command.correlationId ?? 'none');
}

function createFailedEvent(
  command: ImplementSliceCommand,
  error: string,
  resolvedSlicePath?: string,
): SliceImplementationFailedEvent {
  const rawData = command.data as ImplementSliceCommand['data'] & { path?: string };
  const slicePath = resolvedSlicePath ?? rawData.slicePath ?? rawData.path;
  return {
    type: 'SliceImplementationFailed',
    data: {
      slicePath,
      error,
    },
    timestamp: new Date(),
    requestId: command.requestId,
    correlationId: command.correlationId,
  };
}

function createSuccessEvent(
  command: ImplementSliceCommand,
  filesImplemented: string[],
  resolvedSlicePath?: string,
): SliceImplementedEvent {
  const rawData = command.data as ImplementSliceCommand['data'] & { path?: string };
  const slicePath = resolvedSlicePath ?? rawData.slicePath ?? rawData.path;
  return {
    type: 'SliceImplemented',
    data: {
      slicePath,
      filesImplemented,
    },
    timestamp: new Date(),
    requestId: command.requestId,
    correlationId: command.correlationId,
  };
}

function logRetryContext(context: { previousOutputs?: string; attemptNumber?: number } | undefined): void {
  if (context !== undefined && context.previousOutputs !== undefined && context.previousOutputs.length > 0) {
    debugProcess('Retrying with context from previous attempt #%d', context.attemptNumber ?? 1);
    debugProcess('Previous outputs: %s', context.previousOutputs.substring(0, 500));
  }
}

export async function handleImplementSliceCommand(
  command: ImplementSliceCommand,
): Promise<SliceImplementedEvent | SliceImplementationFailedEvent> {
  const rawData = command.data as ImplementSliceCommand['data'] & { path?: string };
  const slicePath = rawData.slicePath ?? rawData.path;
  const { context } = command.data;

  if (slicePath === undefined || slicePath === null || slicePath === '') {
    debugHandler('ERROR: No slice path provided. Expected slicePath or path parameter');
    return createFailedEvent(command, 'No slice path provided. Expected slicePath parameter');
  }

  logCommandDebugInfo(command, slicePath);

  try {
    const sliceRoot = path.resolve(slicePath);
    debugHandler('Resolved paths:');
    debugHandler('  Slice root: %s', sliceRoot);

    if (!existsSync(sliceRoot)) {
      debugHandler('ERROR: Slice directory not found at %s', sliceRoot);
      return createFailedEvent(command, `Slice directory not found at: ${sliceRoot}`, sliceRoot);
    }

    debugProcess('Starting slice implementation for: %s', sliceRoot);
    logRetryContext(context);

    const result = await implementSlice(sliceRoot, context);

    if (!result.success) {
      return createFailedEvent(command, result.error ?? 'Implementation failed', sliceRoot);
    }

    debugResult('Process succeeded');
    debugResult('Files implemented: %d', result.filesImplemented.length);
    debugResult('Files: %s', result.filesImplemented.join(', '));
    debugResult('Returning success event: SliceImplemented');

    return createSuccessEvent(command, result.filesImplemented, sliceRoot);
  } catch (error) {
    debug('ERROR: Exception caught: %O', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createFailedEvent(command, errorMessage, slicePath);
  }
}

export default commandHandler;
