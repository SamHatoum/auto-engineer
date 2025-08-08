#!/usr/bin/env node
import { getFlows } from '../getFlows';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const main = async () => {
  const directory = process.argv[2] || process.cwd();

  try {
    // Suppress debug output by redirecting console methods temporarily
    const originalLog = console.log;
    const originalError = console.error;

    // Only capture our final output
    const outputs: string[] = [];
    console.log = (...args) => {
      // Only allow our final JSON output
      const message = args.join(' ');
      if (message.startsWith('{"success":')) {
        outputs.push(message);
      }
      // Suppress all other console.log calls during execution
    };
    console.error = () => {}; // Suppress all error output during execution

    const flowsPath = resolve(directory, 'flows');
    const { toSchema } = await getFlows(flowsPath);
    const json = JSON.stringify(toSchema(), null, 2);
    const contextDir = resolve(directory, '.context');
    const outPath = resolve(contextDir, 'schema.json');

    mkdirSync(contextDir, { recursive: true });
    writeFileSync(outPath, json);

    // Restore console methods
    console.log = originalLog;
    console.error = originalError;

    // Output success as JSON for parent process
    console.log(
      JSON.stringify({
        success: true,
        outputPath: outPath,
      }),
    );
  } catch (error) {
    // Restore console methods in case of error
    console.log = console.log || (() => {});
    console.error = console.error || (() => {});

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

main();
