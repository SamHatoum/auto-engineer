import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { generateTextWithAI, getAvailableProviders } from '@auto-engineer/ai-gateway';
import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import fg from 'fast-glob';
import createDebug from 'debug';

const debug = createDebug('server-impl:slice');
const debugHandler = createDebug('server-impl:slice:handler');
const debugProcess = createDebug('server-impl:slice:process');
const debugResult = createDebug('server-impl:slice:result');

// System prompt for AI implementation
const SYSTEM_PROMPT = `
You are a software engineer implementing missing logic in a sliced event-driven TypeScript backend. Each slice contains partially scaffolded code, and your task is to complete the logic following implementation instructions embedded in each file.

Project Characteristics:
- Architecture: sliced event-sourced CQRS (Command, Query, Reaction slices)
- Language: TypeScript with type-graphql and Emmett
- Each slice has scaffolded files with implementation instructions clearly marked with comments (e.g., '## IMPLEMENTATION INSTRUCTIONS ##') or TODOs.
- Tests (e.g., *.specs.ts) must pass.
- Type errors are not allowed.

Your Goal:
- Read the implementation instructions from the provided file.
- Generate only the code needed to fulfill the instructions, nothing extra and provide back the whole file without the instructions.
- Maintain immutability and adhere to functional best practices.
- Use only the types and domain constructs already present in the slice.
- Do not remove existing imports or types that are still referenced or required in the file.
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

// Find files that need implementation
function findFilesToImplement(contextFiles: Record<string, string>): Array<[string, string]> {
  return Object.entries(contextFiles).filter(
    ([, content]) => content.includes('TODO:') || content.includes('IMPLEMENTATION INSTRUCTIONS'),
  );
}

// Build prompt for initial implementation
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

// Build prompt for retry with context
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

// Main implementation function
async function implementSlice(
  slicePath: string,
  context?: { previousOutputs?: string; attemptNumber?: number },
): Promise<{ success: boolean; filesImplemented: string[]; error?: string }> {
  const availableProviders = getAvailableProviders();

  if (availableProviders.length === 0) {
    throw new Error(
      'No AI providers configured. Please set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or XAI_API_KEY',
    );
  }

  const AI_PROVIDER = availableProviders[0];
  const sliceName = path.basename(slicePath);

  debugProcess(`Implementing slice: ${sliceName}`);

  try {
    // Load all context files
    const contextFiles = await loadContextFiles(slicePath);
    const filesToImplement = findFilesToImplement(contextFiles);
    const implementedFiles: string[] = [];

    if (filesToImplement.length === 0) {
      debugProcess('No files with TODO or IMPLEMENTATION INSTRUCTIONS found');
      return { success: true, filesImplemented: [] };
    }

    // Implement each file that needs it
    for (const [targetFile] of filesToImplement) {
      debugProcess(`Implementing ${targetFile}`);

      let prompt: string;
      if (context !== undefined && context.previousOutputs !== undefined && context.previousOutputs.length > 0) {
        // Use retry prompt if we have previous context
        prompt = buildRetryPrompt(targetFile, contextFiles, context.previousOutputs);
        debugProcess(`Using retry prompt for attempt #${context.attemptNumber ?? 2}`);
      } else {
        // Use initial prompt for first attempt
        prompt = buildInitialPrompt(targetFile, contextFiles);
      }

      // Generate implementation with AI
      const aiOutput = await generateTextWithAI(prompt, AI_PROVIDER);
      const cleanedCode = extractCodeBlock(aiOutput);

      // Write the implemented file
      const filePath = path.join(slicePath, targetFile);
      await writeFile(filePath, cleanedCode, 'utf-8');

      debugProcess(`Successfully implemented ${targetFile}`);
      implementedFiles.push(targetFile);

      // Update context for next file
      contextFiles[targetFile] = cleanedCode;
    }

    return { success: true, filesImplemented: implementedFiles };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    debugProcess(`Implementation failed: ${errorMessage}`);
    return { success: false, filesImplemented: [], error: errorMessage };
  }
}

function logCommandDebugInfo(command: ImplementSliceCommand): void {
  const { slicePath, context } = command.data;
  debug('Handling ImplementSliceCommand');
  debug('  Slice path: %s', slicePath);
  debug('  Context provided: %s', context ? 'yes' : 'no');
  if (context) {
    debug('  Attempt number: %d', context.attemptNumber ?? 1);
  }
  debug('  Request ID: %s', command.requestId);
  debug('  Correlation ID: %s', command.correlationId ?? 'none');
}

function createFailedEvent(command: ImplementSliceCommand, error: string): SliceImplementationFailedEvent {
  return {
    type: 'SliceImplementationFailed',
    data: {
      slicePath: command.data.slicePath,
      error,
    },
    timestamp: new Date(),
    requestId: command.requestId,
    correlationId: command.correlationId,
  };
}

function createSuccessEvent(command: ImplementSliceCommand, filesImplemented: string[]): SliceImplementedEvent {
  return {
    type: 'SliceImplemented',
    data: {
      slicePath: command.data.slicePath,
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
  const { slicePath, context } = command.data;

  logCommandDebugInfo(command);

  try {
    const sliceRoot = path.resolve(slicePath);
    debugHandler('Resolved paths:');
    debugHandler('  Slice root: %s', sliceRoot);

    if (!existsSync(sliceRoot)) {
      debugHandler('ERROR: Slice directory not found at %s', sliceRoot);
      return createFailedEvent(command, `Slice directory not found at: ${sliceRoot}`);
    }

    debugProcess('Starting slice implementation for: %s', sliceRoot);
    logRetryContext(context);

    const result = await implementSlice(sliceRoot, context);

    if (!result.success) {
      return createFailedEvent(command, result.error ?? 'Implementation failed');
    }

    debugResult('Process succeeded');
    debugResult('Files implemented: %d', result.filesImplemented.length);
    debugResult('Files: %s', result.filesImplemented.join(', '));
    debugResult('Returning success event: SliceImplemented');

    return createSuccessEvent(command, result.filesImplemented);
  } catch (error) {
    debug('ERROR: Exception caught: %O', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createFailedEvent(command, errorMessage);
  }
}

export const implementSliceCommandHandler: CommandHandler<ImplementSliceCommand> = {
  name: 'ImplementSlice',
  handle: async (command: ImplementSliceCommand): Promise<void> => {
    debug('CommandHandler executing for ImplementSlice');
    const result = await handleImplementSliceCommand(command);

    if (result.type === 'SliceImplemented') {
      debug('Command handler completed: success');
      console.log(`✅ Slice implementation completed successfully`);
      console.log(`   Slice: ${path.basename(result.data.slicePath)}`);
      console.log(`   Files implemented: ${result.data.filesImplemented.length}`);
    } else {
      debug('Command handler completed: failure - %s', result.data.error);
      console.error(`❌ Slice implementation failed: ${result.data.error}`);
      process.exit(1);
    }
  },
};
