import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const QUERY_FILES = ['queries.ts', 'mutations.ts'];
const GRAPHQL_DIR = 'src/graphql';

function runCommand(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    const error = e as { stdout?: Buffer; stderr?: Buffer; message?: string };
    let output = '';
    if (error.stdout) output += error.stdout.toString();
    if (error.stderr) output += error.stderr.toString();
    if (!output && error.message != null) output = error.message;
    return output;
  }
}

export function runCodegen(projectPath: string): void {
  const resolvedPath = path.resolve(projectPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`❌ Project path does not exist: ${resolvedPath}`);
  }

  const schemaPath = path.join(resolvedPath, 'schema.graphql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`❌ Schema file not found at ${schemaPath}`);
  }

  const filePaths = QUERY_FILES.map((file) => path.join(resolvedPath, GRAPHQL_DIR, file));

  for (const file of filePaths) {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️ File not found, skipping: ${file}`);
    }
  }

  console.log('▶ Installing dependencies via `npx yarn`...');
  const installOutput = runCommand('npx yarn', resolvedPath);
  console.log(installOutput);

  console.log('\n▶ Running codegen...');
  const output = runCommand('npx yarn codegen', resolvedPath);
  console.log(output);
  console.log('✅ Codegen completed.');
}
