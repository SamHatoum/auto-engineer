#!/usr/bin/env node
import { getFlows } from '../getFlows';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Store original console methods
const originalLog = console.log;
const originalError = console.error;

const main = async () => {
  const directory = process.argv[2] || process.cwd();

  try {
    const flowsPath = resolve(directory, 'flows');
    const { toSchema } = await getFlows(flowsPath);
    const schema = toSchema();
    const json = JSON.stringify(schema, null, 2);
    const contextDir = resolve(directory, '.context');
    const outPath = resolve(contextDir, 'schema.json');

    mkdirSync(contextDir, { recursive: true });
    writeFileSync(outPath, json);
    // Output success as JSON for parent process
    console.log(
      JSON.stringify({
        success: true,
        outputPath: outPath,
      }),
    );
  } catch (error) {
    // Restore console methods in case of error
    console.log = originalLog;
    console.error = originalError;

    // Show the actual error for debugging
    console.error('Actual error:', error);

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
