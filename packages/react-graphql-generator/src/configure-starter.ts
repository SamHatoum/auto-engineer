import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

export function configureStarter(figmaVariablesPath: string, projectPath: string): void {
  const resolvedPath = path.resolve(projectPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`❌ Project path does not exist: ${resolvedPath}`);
  }

  const configureScript = path.join(resolvedPath, 'auto-configure.ts');
  if (!fs.existsSync(configureScript)) {
    console.log('⚠️ No auto-configure.ts found in starter. Skipping configuration.');
    return;
  }

  const absoluteFigmaPath = path.isAbsolute(figmaVariablesPath)
    ? figmaVariablesPath
    : path.resolve(process.cwd(), figmaVariablesPath);

  console.log('FIGMA PATH', absoluteFigmaPath);

  console.log('▶ Running starter configuration in', resolvedPath);
  // const output = runCommand('npx pnpm codegen', resolvedPath);
  const output = runCommand(`npx pnpm auto-configure`, resolvedPath);
  console.log(output);
  console.log('✅ Starter configuration completed.');
}
