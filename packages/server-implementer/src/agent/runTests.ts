import path from 'path';
import fg from 'fast-glob';
import {execa} from 'execa';
import {existsSync} from "fs";
import {unlink} from 'fs/promises';
import {readFile} from 'fs/promises';
import {VitestAssertionResult, VitestTestResult} from "./runSlice";

type VitestReport = {
    testResults?: VitestTestResult[];
};

export type TestResult = {
    success: boolean;
    testErrors: string;
    failedTestFiles: string[];
}

// eslint-disable-next-line complexity
export async function runTests(sliceDir: string, rootDir: string)  : Promise<TestResult> {
    console.log(`🔍 Running tests in ${path.basename(sliceDir)}...`);
    const testFiles = await fg(['*.spec.ts', '*.specs.ts'], {cwd: sliceDir});
    if (testFiles.length === 0) {
        console.warn(`⚠️ No test files found in ${sliceDir}`);
        return {success: true, testErrors: '', failedTestFiles: []};
    } else {
        console.log(`🔍 Found test files in ${path.basename(sliceDir)}:`, testFiles);
    }
    const relativePaths = testFiles.map(f => path.join(sliceDir, f).replace(`${rootDir}/`, ''));
    const reportPath = path.join(sliceDir, 'vitest-results.json');
    try {

        const {
            stdout,
            stderr
        } = await execa('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${reportPath}`, ...relativePaths], {
            cwd: rootDir,
            stdio: 'pipe',
            reject: false,
        })

        // Wait a bit for the file to be written
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if the report file exists and read it
        if (existsSync(reportPath)) {
            try {
                const reportRaw = await readFile(reportPath, 'utf-8');
                const report = JSON.parse(reportRaw) as VitestReport;
                const testResults = report.testResults ?? [];
                const failedFiles = testResults
                    .filter((r: VitestTestResult) => r.status === 'failed')
                    .map((r: VitestTestResult) => {
                        const fileName = r.name ?? r.file;
                        if (!fileName) {
                            console.warn('⚠️ Skipping test result with missing name or file:', r);
                            return path.join(sliceDir, 'unknown');
                        }
                        return path.join(sliceDir, path.basename(fileName));
                    });

                const failedTestSummaries = testResults
                    .filter((r: VitestTestResult) => r.status === 'failed')
                    .map((r: VitestTestResult) => {
                        const fileName = path.basename(r.name ?? r.file ?? 'unknown');

                        if (r.assertionResults.length > 0) {
                            const lines = r.assertionResults
                                .filter((a: VitestAssertionResult) => a.status === 'failed')
                                .map((a: VitestAssertionResult) => `❌ ${a.fullName}\n${a.failureMessages?.join('\n') ?? ''}`);
                            return `📄 ${fileName}\n${lines.join('\n')}`;
                        }
                        // fallback: use top-level message
                        if ('message' in r && typeof r.message === 'string' && r.message.trim() !== '') {
                            return `📄 ${fileName}\n${r.message}`;
                        }

                        return `📄 ${fileName}\n⚠️ Test suite failed but no assertion or error message found.`;
                    })
                    .join('\n\n');

                return {
                    success: failedFiles.length === 0,
                    testErrors: failedTestSummaries || stdout || stderr || 'Tests failed but no error details available',
                    failedTestFiles: failedFiles,
                };
            } catch (parseErr) {
                console.error('Failed to parse test results:', parseErr);
                return {
                    success: false,
                    testErrors: stdout || stderr || 'Failed to parse test results',
                    failedTestFiles: testFiles.map(f => path.join(sliceDir, f)),
                };
            }
        } else {
            // No report file, use stdout/stderr
            return {
                success: false,
                testErrors: stdout || stderr || 'Test execution failed - no report generated',
                failedTestFiles: testFiles.map(f => path.join(sliceDir, f)),
            };
        }
    } catch (err: unknown) {
        const execaErr = err as { stdout?: string; stderr?: string };
        const output = (execaErr.stdout ?? '') + (execaErr.stderr ?? '');
        console.error('Test execution error:', output);
        return {
            success: false,
            testErrors: output || 'Test execution failed with no output',
            failedTestFiles: testFiles.map(f => path.join(sliceDir, f)),
        };
    } finally {
        // Clean up the report file
        if (existsSync(reportPath)) {
            await unlink(reportPath).catch(() => {
            });
        }
    }
}