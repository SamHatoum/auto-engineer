#!/usr/bin/env node
import { resolve, dirname, relative, join } from 'path';
import { existsSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const runInContext = (flowPath: string, projectRoot: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const helperScript = join(__dirname, 'convert-flow-helper.ts');
    
    const child = spawn('npx', ['tsx', helperScript, flowPath], {
      cwd: projectRoot,
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
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Process failed with code ${code}: ${stderr}`));
      }
    });
  });
};

const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: pnpm convert-flow <input-file.flow.ts> [output-file.json]');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  if (!inputFile.endsWith('.flow.ts') && !inputFile.endsWith('.flow.js')) {
    console.error('Error: Input file must be a .flow.ts or .flow.js file');
    process.exit(1);
  }

  try {
    const inputPath = resolve(inputFile);
    
    if (!existsSync(inputPath)) {
      console.error(`Error: File not found: ${inputPath}`);
      process.exit(1);
    }
    
    const outputPath = outputFile ? resolve(outputFile) : undefined;
    
    console.log(`Converting flow: ${inputPath}`);
    
    // Find the project root
    const flowDir = dirname(inputPath);
    let projectRoot = flowDir;
    while (projectRoot !== '/' && !existsSync(`${projectRoot}/package.json`)) {
      projectRoot = dirname(projectRoot);
    }
    
    if (!existsSync(`${projectRoot}/package.json`)) {
      console.error('Error: Could not find package.json in flow directory or its parents');
      process.exit(1);
    }
    
    // Get relative path from project root
    const relativeFlowPath = relative(projectRoot, inputPath);
    
    // Run the conversion in the correct context
    const json = await runInContext(relativeFlowPath, projectRoot);
    
    if (outputPath) {
      writeFileSync(outputPath, json);
      console.log(`✓ Flow converted successfully to: ${outputPath}`);
      console.log('📋 Schema validation performed during conversion');
    } else {
      console.log(json);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error converting flow: ${message}`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});