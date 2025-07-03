import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { generateScaffoldFilePlans, writeScaffoldFilePlans } from './scaffoldFromSchema';
import testSpec from './test-data/specVariant1';
import { readdir } from 'fs/promises';
import * as path from 'path';

async function findTestFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const testFiles: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            testFiles.push(...(await findTestFiles(fullPath)));
        } else if (entry.name.endsWith('specs.ts')) {
            testFiles.push(fullPath);
        }
    }

    return testFiles;
}

describe('Scaffold integration test', () => {
    it.skip('should generate valid TypeScript code and pass all tests', async () => {
        const outputDir = path.join(__dirname, '..', '.generated-domain-tests');

        const plans = await generateScaffoldFilePlans(testSpec.flows, testSpec.messages, outputDir);
        await writeScaffoldFilePlans(plans);

        const testFiles = await findTestFiles(outputDir);
        if (testFiles.length === 0) {
            throw new Error(`No test files found in ${outputDir}`);
        }

        console.log('Running tests on:', testFiles);

        const result = await execa('npx', ['tsx', '--no-warnings', '--test', ...testFiles], {
            reject: false,
        });

        console.log(result.stdout);
        console.error(result.stderr);

        expect(result.exitCode).toBe(0);
    });
});