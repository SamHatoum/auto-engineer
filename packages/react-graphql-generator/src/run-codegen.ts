import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import createDebug from 'debug';

const debug = createDebug('react-graphql-generator:codegen');
const debugCmd = createDebug('react-graphql-generator:codegen:cmd');

const QUERY_FILES = ['queries.ts', 'mutations.ts'];
const GRAPHQL_DIR = 'src/graphql';

function runCommand(cmd: string, cwd: string): string {
  debugCmd('Running command: %s in %s', cmd, cwd);
  try {
    const result = execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    debugCmd('Command successful');
    return result;
  } catch (e) {
    debugCmd('Command failed: %s', cmd);
    const error = e as { stdout?: Buffer; stderr?: Buffer; message?: string };
    let output = '';
    if (error.stdout) output += error.stdout.toString();
    if (error.stderr) output += error.stderr.toString();
    if (!output && error.message != null) output = error.message;
    return output;
  }
}

export function runCodegen(projectPath: string): void {
  debug('Starting codegen for project: %s', projectPath);
  const resolvedPath = path.resolve(projectPath);
  debug('Resolved project path: %s', resolvedPath);

  if (!fs.existsSync(resolvedPath)) {
    debug('ERROR: Project path does not exist: %s', resolvedPath);
    throw new Error(`❌ Project path does not exist: ${resolvedPath}`);
  }

  const schemaPath = path.join(resolvedPath, 'schema.graphql');
  debug('Checking for schema at: %s', schemaPath);
  if (!fs.existsSync(schemaPath)) {
    debug('ERROR: Schema file not found at %s', schemaPath);
    throw new Error(`❌ Schema file not found at ${schemaPath}`);
  }
  debug('Schema file found');

  const filePaths = QUERY_FILES.map((file) => path.join(resolvedPath, GRAPHQL_DIR, file));
  debug('Checking for GraphQL operation files: %o', QUERY_FILES);

  for (const file of filePaths) {
    if (!fs.existsSync(file)) {
      debug('File not found: %s', file);
      console.warn(`⚠️ File not found, skipping: ${file}`);
    } else {
      debug('File found: %s', file);
    }
  }

  debug('Installing dependencies');
  console.log('▶ Installing dependencies via `npx pnpm` in', resolvedPath);
  const installOutput = runCommand('npx pnpm install --include=dev', resolvedPath);
  console.log(installOutput);
  debug('Dependencies installed');

  // Fix execute permissions for node_modules/.bin files
  const binDir = path.join(resolvedPath, 'node_modules', '.bin');
  debug('Checking bin directory: %s', binDir);
  if (fs.existsSync(binDir)) {
    try {
      debug('Fixing execute permissions for bin files');
      runCommand('chmod +x node_modules/.bin/*', resolvedPath);
      debug('Permissions fixed');
    } catch (error) {
      debug('Failed to fix permissions: %O', error);
      console.warn('⚠️ Could not fix bin permissions:', error);
    }
  } else {
    debug('Bin directory does not exist, skipping permission fix');
  }

  debug('Running GraphQL codegen');
  console.log('\n▶ Running codegen...');
  const output = runCommand('npx pnpm codegen', resolvedPath);
  console.log(output);
  debug('Codegen completed successfully');
  console.log('✅ Codegen completed.');
}
