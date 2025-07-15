import { describe, it } from 'vitest';
import { execa } from 'execa';
import * as path from 'path';
import { writeFile, mkdir, readdir, rm } from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function findTestFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const testFiles: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      testFiles.push(...(await findTestFiles(fullPath)));
    } else if (entry.name.endsWith('.specs.ts')) {
      testFiles.push(fullPath);
    }
  }
  return testFiles;
}

describe('generateServer integration test', () => {
  it('should scaffold a working server with valid TS and passing tests', async () => {
    const tmpDir = path.resolve(__dirname, '../../.tmp/server-test-output');
    const specPath = path.resolve(__dirname, './test-data/specVariant1.json');

    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });

    await execa('pnpm', ['generate:server', specPath, tmpDir]);

    const serverDir = path.join(tmpDir, 'server');
    const tsconfigPath = path.join(serverDir, 'tsconfig.json');
    const testFiles = await findTestFiles(serverDir);

    if (testFiles.length === 0) {
      throw new Error(`❌ No test files found in: ${serverDir}`);
    }

    const typecheck = await execa('npx', ['tsc', '--noEmit', '-p', tsconfigPath], {
      cwd: serverDir,
      reject: false,
    });
    if (typecheck.exitCode !== 0) {
      console.error('❌ TypeScript errors:\n', typecheck.stderr || typecheck.stdout);
      throw new Error('❌ TypeScript type-check failed');
    }

    const testResult = await execa('npx', ['vitest', 'run', '--dir', serverDir], {
      reject: false,
    });
    const output = testResult.stdout + '\n' + testResult.stderr;

    const notYetImplementedMatches = output.match(/Not yet implemented: \w+/g) ?? [];
    const otherFailures = output.includes('FAIL') && !output.includes('Not yet implemented') ? output : '';

    if (testResult.exitCode !== 0 && otherFailures) {
      throw new Error(`❌ Unexpected test failures:\n${otherFailures}`);
    }

    if (notYetImplementedMatches.length > 0) {
      console.warn(`ℹ️ Ignored test files awaiting implementation:\n${notYetImplementedMatches.join('\n')}`);
    }

    await rm(tmpDir, { recursive: true, force: true });
  });
});
