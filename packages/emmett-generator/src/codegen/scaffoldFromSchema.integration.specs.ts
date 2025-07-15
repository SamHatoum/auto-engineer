import { describe, it } from 'vitest';
import { execa } from 'execa';
import { scaffoldFromSchema } from './scaffoldFromSchema';
import testSpec from './test-data/specVariant1';
import { readdir, mkdir } from 'fs/promises';
import * as path from 'path';
import { writeFile } from 'fs/promises';
import {rm} from "node:fs/promises";

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

describe('Scaffold integration test', () => {
    it('should generate valid TypeScript code and only fail on "Not yet implemented" tests', async () => {
        const outputDir = path.join(__dirname, '..', 'domain', '/.tmp/test-output');
        
        // Clean up and recreate the output directory before running the test
        await rm(outputDir, { recursive: true, force: true });
        await mkdir(outputDir, { recursive: true });
        
        await scaffoldFromSchema(testSpec.flows, testSpec.messages, outputDir);
        
        // Copy the shared module from the generator to the test output directory
        const sharedSourceDir = path.join(__dirname, '..', 'domain', 'shared');
        const sharedTargetDir = path.join(outputDir, 'shared');
        await execa('cp', ['-r', sharedSourceDir, sharedTargetDir]);
        const testFiles = await findTestFiles(outputDir);

        if (testFiles.length === 0) {
            throw new Error(`No test files found in ${outputDir}`);
        }

        const tempTsConfigPath = path.join(outputDir, 'tsconfig.generated.json');
        await writeFile(
            tempTsConfigPath,
            JSON.stringify({
                extends: path.relative(outputDir, path.join(__dirname, '../../../../tsconfig.json')),
                include: ['**/*.ts'],
            }, null, 2)
        );

        const typecheck = await execa('npx', ['tsc', '--noEmit', '-p', tempTsConfigPath], {
            cwd: outputDir,
            reject: false,
        });
        if (typecheck.exitCode !== 0) {
            console.error('❌ TypeScript errors:\n', typecheck.stderr || typecheck.stdout);
            throw new Error('TypeScript type-check failed');
        }
        const testResult = await execa('npx', ['vitest', 'run', '--dir', outputDir], {
            reject: false,
        });
        const output = testResult.stdout + '\n' + testResult.stderr;

        const notYetImplementedMatches = output.match(/Not yet implemented: \w+/g) ?? [];
        const otherFailures = output.includes('FAIL') && !output.includes('Not yet implemented')
            ? output
            : '';

        if (testResult.exitCode !== 0 && otherFailures) {
            throw new Error(`❌ Unexpected test failures:\n${otherFailures}`);
        }

        if (notYetImplementedMatches.length > 0) {
            console.warn(`ℹ️ Ignored test files awaiting implementation:\n${notYetImplementedMatches.join('\n')}`);
        }
        await rm(outputDir, { recursive: true, force: true });
    });
});