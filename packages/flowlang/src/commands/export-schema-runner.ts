#!/usr/bin/env node
// This runner is executed in the target directory context to avoid module resolution issues
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import createDebug from 'debug';

const debug = createDebug('flowlang:export-schema-runner');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '4';
} // blue

const main = async () => {
  const contextDir = process.argv[2] || './.context';
  const flowsDir = process.argv[3] || './flows';

  debug('Starting export-schema-runner');
  debug('  Context dir: %s', contextDir);
  debug('  Flows dir: %s', flowsDir);

  try {
    // Import from the installed package in the target directory
    // This ensures we use the same module instance as the flow files
    const flowlang = await import('@auto-engineer/flowlang');
    const { getFlows } = flowlang;

    if (typeof getFlows !== 'function') {
      throw new Error('getFlows not found in @auto-engineer/flowlang exports');
    }

    const flowsPath = resolve(process.cwd(), flowsDir);
    debug('Resolved flows path: %s', flowsPath);

    const result = await getFlows({ root: flowsPath });
    const schema = result.toSchema();
    debug(
      'Schema generated with %d flows, %d messages, %d integrations',
      schema.flows.length,
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
