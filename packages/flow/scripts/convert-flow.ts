#!/usr/bin/env node
import { resolve, dirname, relative, join } from 'path';
import { existsSync, writeFileSync, statSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const runInContext = (flowPath: string, projectRoot: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const helperScript = join(__dirname, 'convert-flow-helper.ts');

    const child = spawn('npx', ['tsx', helperScript, flowPath], {
      cwd: projectRoot,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: string) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: string) => {
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

const validateArgs = (args: string[]): void => {
  if (args.length === 0) {
    console.error('Usage: pnpm convert-flow <input-file.flow.ts> [output-file-or-dir]');
    process.exit(1);
  }
};

const validateInputFile = (inputFile: string): void => {
  if (!inputFile.endsWith('.flow.ts') && !inputFile.endsWith('.flow.js')) {
    console.error('Error: Input file must be a .flow.ts or .flow.js file');
    process.exit(1);
  }
};

const validateInputPath = (inputPath: string): void => {
  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }
};

const resolveOutputPath = (outputFile: string | undefined): string | undefined => {
  if (outputFile === undefined || outputFile === '') {
    return undefined;
  }

  const resolved = resolve(outputFile);
  if (existsSync(resolved) && statSync(resolved).isDirectory()) {
    return join(resolved, 'schema.json');
  }
  return resolved;
};

const findProjectRoot = (startDir: string): string => {
  let projectRoot = startDir;
  while (projectRoot !== '/' && !existsSync(`${projectRoot}/package.json`)) {
    projectRoot = dirname(projectRoot);
  }

  if (!existsSync(`${projectRoot}/package.json`)) {
    console.error('Error: Could not find package.json in flow directory or its parents');
    process.exit(1);
  }

  return projectRoot;
};

const writeOutput = (outputPath: string | undefined, json: string): void => {
  if (outputPath !== undefined && outputPath !== '') {
    writeFileSync(outputPath, json);
    console.log(`✓ Flow converted successfully to: ${outputPath}`);
    console.log('📋 Schema validation performed during conversion');
  } else {
    console.log(json);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  validateArgs(args);

  const inputFile = args[0];
  const outputFile = args[1];

  validateInputFile(inputFile);

  try {
    const inputPath = resolve(inputFile);
    validateInputPath(inputPath);

    const outputPath = resolveOutputPath(outputFile);

    console.log(`Converting flow: ${inputPath}`);

    const flowDir = dirname(inputPath);
    const projectRoot = findProjectRoot(flowDir);
    const relativeFlowPath = relative(projectRoot, inputPath);

    const json = await runInContext(relativeFlowPath, projectRoot);
    writeOutput(outputPath, json);
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
