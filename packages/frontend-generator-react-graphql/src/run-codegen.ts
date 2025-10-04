import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import createDebug from 'debug';

const debug = createDebug('auto:frontend-generator-react-graphql:codegen');
const debugCmd = createDebug('auto:frontend-generator-react-graphql:codegen:cmd');

const QUERY_FILES = ['queries.ts', 'mutations.ts'];
const GRAPHQL_DIR = 'src/graphql';

function runCommand(cmd: string, cwd: string): string {
  debugCmd('Running command: %s in %s', cmd, cwd);
  const result = execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  debugCmd('Command successful');
  return result;
}

export function runCodegen(projectPath: string): void {
  debug('Starting codegen for project: %s', projectPath);
  const resolvedPath = path.resolve(projectPath);
  debug('Resolved project path: %s', resolvedPath);

  if (!fs.existsSync(resolvedPath)) {
    debug('ERROR: Project path does not exist: %s', resolvedPath);
    throw new Error(`Project path does not exist: ${resolvedPath}`);
  }

  const schemaPath = path.join(resolvedPath, 'schema.graphql');
  debug('Checking for schema at: %s', schemaPath);
  if (!fs.existsSync(schemaPath)) {
    debug('ERROR: Schema file not found at %s', schemaPath);
    throw new Error(`Schema file not found at ${schemaPath}`);
  }
  debug('Schema file found');

  const filePaths = QUERY_FILES.map((file) => path.join(resolvedPath, GRAPHQL_DIR, file));
  debug('Checking for GraphQL operation files: %o', QUERY_FILES);

  for (const file of filePaths) {
    if (!fs.existsSync(file)) {
      debug('File not found: %s', file);
      debug('File not found, skipping: %s', file);
    } else {
      debug('File found: %s', file);
    }
  }

  debug('Installing dependencies');
  debug('Installing dependencies via `npx pnpm` in %s', resolvedPath);
  const installOutput = runCommand('npx pnpm install --include=dev', resolvedPath);
  debug('Install output: %s', installOutput);
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
      console.error('Failed to fix permissions: %O', error);
      console.error('Could not fix bin permissions: %O', error);
    }
  } else {
    debug('Bin directory does not exist, skipping permission fix');
  }

  debug('Running GraphQL codegen');
  debug('Running codegen...');
  const output = runCommand('npx pnpm codegen', resolvedPath);
  debug('Codegen output: %s', output);
  debug('Codegen completed successfully');
  debug('Codegen completed.');
}
