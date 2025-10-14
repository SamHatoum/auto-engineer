#!/usr/bin/env node
// This runner is executed in the target directory context to avoid module resolution issues
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import createDebug from 'debug';
import { NodeFileStore } from '@auto-engineer/file-store';

const debug = createDebug('auto:narrative:export-schema-runner');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '4';
} // blue

const main = async () => {
  const contextDir = process.argv[2] || './.context';
  const narrativesDir = process.argv[3] || './narratives';

  debug('Starting export-schema-runner');
  debug('  Context dir: %s', contextDir);
  debug('  Flows dir: %s', narrativesDir);

  try {
    // Import from the installed package in the target directory
    // This ensures we use the same module instance as the flow files
    const narrative = await import('@auto-engineer/narrative');
    const { getNarratives } = narrative;

    if (typeof getNarratives !== 'function') {
      throw new Error('getNarratives not found in @auto-engineer/narrative exports');
    }

    const narrativesPath = resolve(process.cwd(), narrativesDir);
    debug('Resolved narratives path: %s', narrativesPath);

    const result = await getNarratives({ vfs: new NodeFileStore(), root: narrativesPath });
    const schema = result.toModel();
    debug(
      'Schema generated with %d narratives, %d messages, %d integrations',
      schema.narratives.length,
      schema.messages.length,
      schema.integrations?.length ?? 0,
    );

    const json = JSON.stringify(schema, null, 2);
    const resolvedContextDir = resolve(process.cwd(), contextDir);
    const outPath = resolve(resolvedContextDir, 'schema.json');

    mkdirSync(resolvedContextDir, { recursive: true });
    writeFileSync(outPath, json);
    debug('Schema written to: %s', outPath);

    // Output success as JSON for parent process
    console.log(
      JSON.stringify({
        success: true,
        outputPath: outPath,
      }),
    );
  } catch (error) {
    debug('Error occurred: %o', error);

    // Output error as JSON for parent process
    console.log(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
    );
    process.exit(1);
  }
};

void main();
