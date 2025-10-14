#!/usr/bin/env node
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const main = async () => {
  const flowPath = process.argv[2];

  if (!flowPath) {
    console.error('Usage: tsx convert-flow-helper.ts <flow-file>');
    process.exit(1);
  }

  try {
    const absolutePath = resolve(flowPath);
    const flowDir = dirname(absolutePath);

    // Create a temporary wrapper script file in the same directory as the flow file
    const tempScript = join(flowDir, `.convert-flow-wrapper-${Date.now()}.mjs`);
    const wrapperScript = `
import { convertFlowToJson } from '@auto-engineer/narrative';

const run = async () => {
  try {
    const json = await convertFlowToJson('${absolutePath}');
    console.log('__JSON_START__');
    console.log(json);
    console.log('__JSON_END__');
  } catch (error) {
    console.error('Error in wrapper:', error);
    process.exit(1);
  }
};

run();
`;

    writeFileSync(tempScript, wrapperScript);

    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['tsx', tempScript], {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: flowDir, // Set working directory to the flow file's directory
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        // Clean up temp file
        try {
          unlinkSync(tempScript);
        } catch {
          // Ignore cleanup errors
        }

        if (stderr) {
          console.error(stderr.trim());
        }
        if (code === 0) {
          // Extract JSON between markers
          const jsonStart = stdout.indexOf('__JSON_START__');
          const jsonEnd = stdout.indexOf('__JSON_END__');

          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonContent = stdout.substring(jsonStart + '__JSON_START__\n'.length, jsonEnd).trim();
            console.log(jsonContent);
          } else {
            console.error('Error: Could not find JSON markers in output');
            console.log(stdout.trim());
          }
          resolve(undefined);
        } else {
          reject(new Error(`Process failed with code ${code}`));
        }
      });
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

void main();
