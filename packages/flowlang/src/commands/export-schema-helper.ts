#!/usr/bin/env node
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import createDebug from 'debug';

const debug = createDebug('flowlang:export-schema-helper');

const main = async () => {
  const directory = process.argv[2] || process.cwd();
  debug('Starting export-schema-helper with directory: %s', directory);

  try {
    // Import getFlows from the project's node_modules to ensure we use the same module context
    const projectFlowlangPath = resolve(
      directory,
      'node_modules',
      '@auto-engineer',
      'flowlang',
      'dist',
      'src',
      'getFlows.js',
    );
    debug('Importing getFlows from: %s', projectFlowlangPath);

    const flowlangModule = (await import(pathToFileURL(projectFlowlangPath).href)) as {
      getFlows: typeof import('../getFlows').getFlows;
    };
    const { getFlows } = flowlangModule;

    const flowsPath = resolve(directory, 'flows');
    debug('Resolved flows path: %s', flowsPath);

    const { toSchema } = await getFlows(flowsPath);
    const schema = toSchema();
    debug(
      'Schema generated with %d flows, %d messages, %d integrations',
      schema.flows.length,
      schema.messages.length,
      schema.integrations?.length ?? 0,
    );

    const json = JSON.stringify(schema, null, 2);
    const contextDir = resolve(directory, '.context');
    const outPath = resolve(contextDir, 'schema.json');

    mkdirSync(contextDir, { recursive: true });
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
