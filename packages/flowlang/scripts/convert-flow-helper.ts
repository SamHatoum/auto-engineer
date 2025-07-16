#!/usr/bin/env node
import { spawn } from 'child_process';
import { resolve } from 'path';

const main = async () => {
  const flowPath = process.argv[2];
  
  if (!flowPath) {
    console.error('Usage: tsx convert-flow-helper.ts <flow-file>');
    process.exit(1);
  }

  try {
    const absolutePath = resolve(flowPath);
    
    // Create a wrapper script that imports the flow and outputs the registry
    const wrapperScript = `
      import { convertFlowToJson } from '@auto-engineer/flowlang';
      
      const run = async () => {
        try {
          const json = await convertFlowToJson('${absolutePath}');
          console.log(json);
        } catch (error) {
          console.error('Error in wrapper:', error);
          process.exit(1);
        }
      };
      
      run();
    `;
    
    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['tsx', '--eval', wrapperScript], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (stderr) {
          console.error(stderr.trim());
        }
        if (code === 0) {
          console.log(stdout.trim());
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

main();