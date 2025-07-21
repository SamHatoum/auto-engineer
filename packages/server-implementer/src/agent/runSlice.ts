import path from 'path';
import fg from 'fast-glob';
import {generateTextWithAI, getAvailableProviders} from '@auto-engineer/ai-gateway';
import {readFile, writeFile, access} from 'fs/promises';
import {execa} from 'execa';
import {SYSTEM_PROMPT} from '../prompts/systemPrompt.js';
import {extractCodeBlock} from '../utils/extractCodeBlock.js';
import {existsSync} from "fs";
import {unlink} from 'fs/promises';

const availableProviders = getAvailableProviders();
const AI_PROVIDER = availableProviders[0];

if (availableProviders.length === 0) {
    console.error('❌ No AI providers configured. Please set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or XAI_API_KEY');
    process.exit(1);
}

type TestAndTypecheckResult = {
    success: boolean;
    failedTestFiles: string[];
    failedTypecheckFiles: string[];
    testErrors: string;
    typecheckErrors: string;
};

type VitestAssertionResult = {
    status: string;
    fullName: string;
    failureMessages?: string[];
};

type VitestTestResult = {
    file: string;
    status: string;
    assertionResults: VitestAssertionResult[];
};

type VitestReport = {
    testResults?: VitestTestResult[];
};


export async function runSlice(sliceDir: string, flow: string): Promise<void> {
    const sliceName = path.basename(sliceDir);
    console.log(`✏️ Implementing slice: ${sliceName} for flow: ${flow}`);
    const contextFiles = await loadContextFiles(sliceDir);
    const filesToImplement = findFilesToImplement(contextFiles);
    for (const [targetFile] of filesToImplement) {
        await implementFileFromAI(sliceDir, targetFile, contextFiles);
    }
    const result = await runTestsAndTypecheck(sliceDir);
    reportTestAndTypecheckResults(sliceDir, result);
    const hasFailures = result.failedTestFiles.length > 0 || result.failedTypecheckFiles.length > 0;
    if (hasFailures) {
        await retryFailedFiles(sliceDir, flow, result);
        if (result.failedTestFiles.length > 0) {
            await retryFailedTests(sliceDir, result, flow);
        }
    } else {
        console.log(`✅ All tests and checks passed on first attempt.`);
    }
}

async function retryFailedFiles(sliceDir: string, flow: string, initialResult: TestAndTypecheckResult) {
    let contextFiles = await loadContextFiles(sliceDir);
    let result = initialResult;

    for (let attempt = 1; attempt <= 5; attempt++) {
        if (result.failedTypecheckFiles.length === 0) {
            console.log(`✅ Typecheck issues resolved after attempt ${attempt - 1}`);
            break;
        }

        console.log(`🔁 Typecheck retry attempt ${attempt} for ${result.failedTypecheckFiles.length} files...`);
        contextFiles = await loadContextFiles(sliceDir);

        for (const filePath of result.failedTypecheckFiles) {
            const fileName = path.basename(filePath);
            const retryPrompt = buildRetryPrompt(fileName, contextFiles, result.testErrors, result.typecheckErrors);
            console.log(`🔧 Retrying typecheck error in ${fileName} in flow ${flow}...`);
            const aiOutput = await generateTextWithAI(retryPrompt, AI_PROVIDER);
            const cleanedCode = extractCodeBlock(aiOutput);
            await writeFile(path.join(sliceDir, fileName), cleanedCode, 'utf-8');
            console.log(`♻️ Updated ${fileName} to fix typecheck errors`);
        }
        result = await runTestsAndTypecheck(sliceDir);
        reportTestAndTypecheckResults(sliceDir, result);
    }

    // If test fix introduced a new type error, handle it before continuing
    if (result.failedTypecheckFiles.length > 0) {
        console.log(`⚠️ Fixing tests caused typecheck errors. Retrying typecheck fixes...`);
        // Create a new result object with only typecheck errors
        const typecheckOnlyResult = {
            ...result,
            testErrors: '',  // Clear test errors since we're only fixing typecheck
            failedTestFiles: [] // Clear failed test files
        };
        result = await retryFailedFiles(sliceDir, path.basename(sliceDir), typecheckOnlyResult);

        // After fixing typecheck, re-run everything to get fresh results
        const freshResult = await runTestsAndTypecheck(sliceDir);
        reportTestAndTypecheckResults(sliceDir, freshResult);
        result = freshResult;

        if (result.failedTestFiles.length === 0) {
            console.log(`✅ All test issues resolved after fixing type errors.`);
        }
    }
    return result;
}

async function loadContextFiles(sliceDir: string): Promise<Record<string, string>> {
    const files = await fg(['*.ts'], {cwd: sliceDir});
    const context: Record<string, string> = {};
    for (const file of files) {
        const absPath = path.join(sliceDir, file);
        context[file] = await readFile(absPath, 'utf-8');
    }
    return context;
}

function findFilesToImplement(contextFiles: Record<string, string>) {
    return Object.entries(contextFiles).filter(([, content]) =>
        content.includes('TODO:') || content.includes('IMPLEMENTATION INSTRUCTIONS')
    );
}

function buildInitialPrompt(targetFile: string, context: Record<string, string>): string {
    return `
${SYSTEM_PROMPT}

---
📄 Target file to implement: ${targetFile}

${context[targetFile]}

---
🧠 Other files in the same slice:
${Object.entries(context)
        .filter(([name]) => name !== targetFile)
        .map(([name, content]) => `// File: ${name}\n${content}`)
        .join('\n\n')}

---
Return only the whole updated file of ${targetFile}. Do not remove existing imports or types that are still referenced or required in the file. The file returned has to be production ready.
`.trim();
}

function buildRetryPrompt(
    targetFile: string,
    context: Record<string, string>,
    testErrors: string,
    typeErrors: string
): string {
    return `
${SYSTEM_PROMPT}

---
The previous implementation of ${targetFile} caused test or type-check failures.

📄 File to fix: ${targetFile}

${context[targetFile]}

🧠 Other files in the same slice:
${Object.entries(context)
        .filter(([name]) => name !== targetFile)
        .map(([name, content]) => `// File: ${name}\n${content}`)
        .join('\n\n')}

🧪 Test errors:
${testErrors || 'None'}

📐 Typecheck errors:
${typeErrors || 'None'}

---
Return only the corrected full contents of ${targetFile}, no commentary, no markdown.
`.trim();
}

async function implementFileFromAI(sliceDir: string, targetFile: string, contextFiles: Record<string, string>) {
    const filePath = path.join(sliceDir, targetFile);
    const prompt = buildInitialPrompt(targetFile, contextFiles);
    console.log(`🔮 Analysing and Implementing ${targetFile}`);
    const aiOutput = await generateTextWithAI(prompt, AI_PROVIDER);
    //console.log('AI output:', aiOutput);
    const cleanedCode = extractCodeBlock(aiOutput);
    await writeFile(filePath, cleanedCode, 'utf-8');

    console.log(`♻ Implemented ${targetFile}`);
}


export async function runTestsAndTypecheck(sliceDir: string): Promise<TestAndTypecheckResult> {
    const rootDir = await findProjectRoot(sliceDir);

    const testResult = await runTests(sliceDir, rootDir);
    const typecheckResult = await runTypecheck(sliceDir, rootDir);

    return {
        success: testResult.success && typecheckResult.success,
        failedTestFiles: testResult.failedTestFiles,
        failedTypecheckFiles: typecheckResult.failedTypecheckFiles,
        testErrors: testResult.testErrors,
        typecheckErrors: typecheckResult.typecheckErrors,
    };
}

async function retryFailedTests(sliceDir: string, result: TestAndTypecheckResult, flow: string) {
    let contextFiles = await loadContextFiles(sliceDir);

    for (let attempt = 1; attempt <= 5; attempt++) {
        if (result.failedTestFiles.length === 0) {
            console.log(`✅ Test failures resolved after attempt ${attempt - 1}`);
            break;
        }

        console.log(`🔁 Test retry attempt ${attempt} for ${result.failedTestFiles.length} files...`);

        const smartPrompt = `
${SYSTEM_PROMPT}

---
🧪 The current implementation has test failures.

📄 Test errors:
${result.testErrors || 'None'}

🧠 Full slice context:
${Object.entries(contextFiles)
            .map(([name, content]) => `// File: ${name}\n${content}`)
            .join('\n\n')}

---
Please return the full corrected content of a single file (not a test file) that should be updated to fix the failing tests.

Use this format:
\`\`\`ts
// File: <fileName>.ts
<corrected code>
\`\`\`

No commentary or markdown outside the code block.
`.trim();

        console.log('🔮 Asking AI to suggest a fix for test failures...');
        console.log('🧪 testErrors:\n', result.testErrors);
        console.log('📨 smartPrompt:\n', smartPrompt);
        const aiOutput = await generateTextWithAI(smartPrompt, AI_PROVIDER);
        const cleaned = extractCodeBlock(aiOutput);
        const match = cleaned.match(/^\/\/ File: (.+?)\n([\s\S]*)/m);
        if (!match) {
            console.warn(`⚠️ Skipping retry. AI output didn't match expected format.`);
            break;
        }

        const [fileName, code] = match;
        const absPath = path.join(sliceDir, fileName.trim());
        await writeFile(absPath, code.trim(), 'utf-8');
        console.log('writing file ', absPath);
        console.log('writing code ', code.trim());
        console.log(`♻️ Updated ${fileName.trim()} to fix tests`);
        contextFiles = await loadContextFiles(sliceDir);

        result = await runTestsAndTypecheck(sliceDir);
        reportTestAndTypecheckResults(sliceDir, result);
        // If test fix introduced a new type error, handle it before continuing
        if (result.failedTypecheckFiles.length > 0) {
            console.log(`⚠️ Fixing tests caused typecheck errors. Retrying typecheck fixes...`);
            result = await retryFailedFiles(sliceDir, flow, result);
            if (result.failedTestFiles.length === 0) {
                console.log(`✅ All test issues resolved after fixing type errors.`);
                break;
            }
        }
        contextFiles = await loadContextFiles(sliceDir);
    }

    if (result.failedTestFiles.length > 0) {
        console.error(`❌ Some test failures remain after retry attempts.`);
        for (const file of result.failedTestFiles) {
            console.log(`   - ${path.relative(sliceDir, file)}`);
        }
    }
}


// eslint-disable-next-line complexity
async function runTests(sliceDir: string, rootDir: string) {
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
        });


        // Run the tests
        // const {stdout, stderr} = await execa('npx', [
        //     'vitest',
        //     'run',
        //     '--reporter=json',
        //     `--outputFile=${reportPath}`,
        //     ...testFiles
        // ], {
        //     cwd: sliceDir,
        //     reject: false, // Don't reject on non-zero exit code
        // });

        // Wait a bit for the file to be written
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if the report file exists and read it
        if (existsSync(reportPath)) {
            try {
                const reportRaw = await readFile(reportPath, 'utf-8');
                const report = JSON.parse(reportRaw) as VitestReport;
                console.log('test results', report);
                const testResults = report.testResults ?? [];

                const failedFiles = testResults
                    .filter((r: VitestTestResult) => r.status === 'failed')
                    .map((r: VitestTestResult) => path.join(sliceDir, path.basename(r.file)));

                const failedTestSummaries = testResults
                    .filter((r: VitestTestResult) => r.status === 'failed')
                    .map((r: VitestTestResult) => {
                        const lines = r.assertionResults
                            .filter((a: VitestAssertionResult) => a.status === 'failed')
                            .map((a: VitestAssertionResult) => `❌ ${a.fullName}\n${a.failureMessages?.join('\n') ?? ''}`);
                        return `📄 ${path.basename(r.file)}\n${lines.join('\n')}`;
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

async function runTypecheck(sliceDir: string, rootDir: string) {
    try {
        const result = await execa('npx', ['tsc', '--noEmit'], {
            cwd: rootDir,
            stdio: 'pipe',
            reject: false,
        });
        const output = (result.stdout ?? '') + (result.stderr ?? '');
        if (result.exitCode !== 0 || output.includes('error')) {
            return await processTypecheckOutput(output, sliceDir, rootDir);
        }
        return {success: true, typecheckErrors: '', failedTypecheckFiles: []};
    } catch (err: unknown) {
        const execaErr = err as { stdout?: string; stderr?: string };
        const output = (execaErr.stdout ?? '') + (execaErr.stderr ?? '');
        console.error('TypeScript execution error:', output);
        const files = await fg(['*.ts'], {cwd: sliceDir, absolute: true});
        return {success: false, typecheckErrors: output, failedTypecheckFiles: files};
    }
}

function getTypecheckPatterns(): RegExp[] {
    return [
        /^([^:]+\.ts)\(\d+,\d+\): error/gm,
        /error TS\d+: (.+) '([^']+\.ts)'/gm,
        /^([^:]+\.ts):\d+:\d+\s+-\s+error/gm,
    ];
}

function extractFailedFiles(output: string, patterns: RegExp[], rootDir: string, sliceDir?: string): string[] {
    const failedFiles = new Set<string>();

    for (const pattern of patterns) {
        for (const match of output.matchAll(pattern)) {
            const filePath = match[1] ? path.resolve(rootDir, match[1]) : '';

            const notNodeModules = !filePath.includes('node_modules');
            const inSlice = sliceDir === undefined || filePath.startsWith(sliceDir);

            if (notNodeModules && inSlice) {
                failedFiles.add(filePath);
            }
        }
    }

    return Array.from(failedFiles);
}

async function processTypecheckOutput(output: string, sliceDir: string, rootDir: string) {
    const relativePath = path.relative(rootDir, sliceDir);
    const filtered = output
        .split('\n')
        .filter(line => {
            const hasError = line.includes('error TS') || line.includes('): error');
            const notNodeModules = !line.includes('node_modules');
            const hasSlicePath = line.includes(relativePath) || line.includes(sliceDir);
            return hasError && notNodeModules && hasSlicePath;
        })
        .join('\n');

    if (filtered.trim() === '') {
        return {success: true, typecheckErrors: '', failedTypecheckFiles: []};
    }

    const failedFiles = await processTypecheckFailure(filtered, rootDir, sliceDir);
    return {
        success: false,
        typecheckErrors: filtered,
        failedTypecheckFiles: failedFiles,
    };
}

async function processTypecheckFailure(output: string, rootDir: string, sliceDir: string): Promise<string[]> {
    const patterns = getTypecheckPatterns();
    let failed = extractFailedFiles(output, patterns, rootDir, sliceDir);

    if (failed.length === 0 && output.includes('error')) {
        failed = await fg(['*.ts'], {cwd: sliceDir, absolute: true});
    }

    return failed;
}

async function findProjectRoot(startDir: string): Promise<string> {
    let dir = startDir;
    while (dir !== path.dirname(dir)) {
        try {
            await access(path.join(dir, 'package.json'));
            return dir;
        } catch {
            dir = path.dirname(dir);
        }
    }
    throw new Error('❌ Could not find project root');
}

function reportTestAndTypecheckResults(sliceDir: string, result: TestAndTypecheckResult) {
    const sliceName = path.basename(sliceDir);
    if (result.success) {
        console.log(`✅ All Tests and checks passed for: ${sliceName}`);
        return;
    }
    console.error(`❌ ${sliceName} failed tests or type-checks.`);
    if (result.failedTestFiles.length) {
        const files = result.failedTestFiles.map(f => path.relative(sliceDir, f));
        console.log(`🧪 Failed test files: ${files.join(', ')}`);
        if (result.testErrors) {
            console.log(`📝 Test errors:\n${result.testErrors}`);
        }
    }
    if (result.failedTypecheckFiles.length) {
        const files = result.failedTypecheckFiles.map(f => path.relative(sliceDir, f));
        console.log(`📐 Failed typecheck files: ${files.join(', ')}`);
        if (result.typecheckErrors) {
            console.log(`📝 Typecheck errors:\n${result.typecheckErrors}`);
        }
    }
}