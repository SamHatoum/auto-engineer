import path from 'path';
import fg from 'fast-glob';
import { generateTextWithAI, getAvailableProviders } from '@auto-engineer/ai-gateway';
import { readFile, writeFile, access } from 'fs/promises';
import { execa } from 'execa';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt.js';
import { extractCodeBlock } from '../utils/extractCodeBlock.js';

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


export async function runSlice(sliceDir: string): Promise<void> {
    console.log(`✏️ Implementing slice: ${sliceDir}`);

    let contextFiles = await loadContextFiles(sliceDir);
    const filesToImplement = findFilesToImplement(contextFiles);

    for (const [targetFile] of filesToImplement) {
        await implementFileFromAI(sliceDir, targetFile, contextFiles);
    }

    let result = await runTestsAndTypecheck(sliceDir);
    reportTestAndTypecheckResults(sliceDir, result);

    const failedFiles = new Set([...result.failedTestFiles, ...result.failedTypecheckFiles]);

    for (let attempt = 1; attempt <= 3 && failedFiles.size > 0; attempt++) {
        console.log(`🔁 Retry attempt ${attempt} for ${failedFiles.size} files...`);

        contextFiles = await loadContextFiles(sliceDir);

        for (const filePath of failedFiles) {
            const fileName = path.basename(filePath);
            const prompt = buildRetryPrompt(fileName, contextFiles, result.testErrors, result.typecheckErrors);

            const aiOutput = await generateTextWithAI(prompt, AI_PROVIDER);
            const cleanedCode = extractCodeBlock(aiOutput);

            await writeFile(path.join(sliceDir, fileName), cleanedCode, 'utf-8');
            console.log(`♻️ Retried and updated ${fileName}`);
        }

        result = await runTestsAndTypecheck(sliceDir);
        reportTestAndTypecheckResults(sliceDir, result);

        failedFiles.clear();
        result.failedTestFiles.forEach(f => failedFiles.add(f));
        result.failedTypecheckFiles.forEach(f => failedFiles.add(f));
    }
}

async function loadContextFiles(sliceDir: string): Promise<Record<string, string>> {
    const files = await fg(['*.ts'], { cwd: sliceDir });
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

async function runTests(sliceDir: string, rootDir: string) {
    const testFiles = await fg(['*.spec.ts', '*.specs.ts'], { cwd: sliceDir });

    if (testFiles.length === 0) {
        console.warn(`⚠️ No test files found in ${sliceDir}`);
        return { success: true, testErrors: '', failedTestFiles: [] };
    }

    try {
        const relativePaths = testFiles.map(f => path.join(sliceDir, f).replace(`${rootDir}/`, ''));
        const result = await execa('npx', ['vitest', 'run', ...relativePaths], {
            cwd: rootDir,
            stdio: 'pipe',
            reject: false,
        });

        const output = (result.stdout ?? '') + (result.stderr ?? '');
        console.log('Test output:', output);

        if (result.exitCode !== 0 || output.includes('FAIL') || output.includes('failed')) {
            const filteredOutput = filterTestErrors(output, sliceDir);
            const failPatterns = [
                /FAIL\s+(\S+\.specs?\.ts)/g,
                /❯\s+(\S+\.specs?\.ts)/g,
                /(\S+\.specs?\.ts)\s+>/g,
                /\s+(\S+\.specs?\.ts)\s+\d+ms/g,
            ];

            return {
                success: false,
                testErrors: filteredOutput,
                failedTestFiles: extractFailedFiles(filteredOutput, failPatterns, rootDir, sliceDir),
            };
        }

        return {
            success: true,
            testErrors: '',
            failedTestFiles: [],
        };
    } catch (err: unknown) {
        const execaErr = err as { stdout?: string; stderr?: string };
        const output = (execaErr.stdout ?? '') + (execaErr.stderr ?? '');
        console.error('Test execution error:', output);
        return {
            success: false,
            testErrors: output,
            failedTestFiles: testFiles.map(f => path.join(sliceDir, f)),
        };
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
        return { success: true, typecheckErrors: '', failedTypecheckFiles: [] };
    } catch (err: unknown) {
        const execaErr = err as { stdout?: string; stderr?: string };
        const output = (execaErr.stdout ?? '') + (execaErr.stderr ?? '');
        console.error('TypeScript execution error:', output);
        const files = await fg(['*.ts'], { cwd: sliceDir, absolute: true });
        return { success: false, typecheckErrors: output, failedTypecheckFiles: files };
    }
}

function getTypecheckPatterns(): RegExp[] {
    return [
        /^([^:]+\.ts)\(\d+,\d+\): error/gm,
        /error TS\d+: (.+) '([^']+\.ts)'/gm,
        /^([^:]+\.ts):\d+:\d+\s+-\s+error/gm,
    ];
}

function filterTestErrors(output: string, sliceDir: string): string {
    const lines = output.split('\n');
    const sliceErrorLines = lines.filter(line => 
        line.includes(sliceDir) && 
        !line.includes('node_modules') &&
        (line.includes('FAIL') || line.includes('failed') || line.includes('error'))
    );
    return sliceErrorLines.join('\n');
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
        return { success: true, typecheckErrors: '', failedTypecheckFiles: [] };
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
        failed = await fg(['*.ts'], { cwd: sliceDir, absolute: true });
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
    if (result.success) {
        console.log(`✅ All Tests and checks passed for: ${sliceDir}`);
        return;
    }

    console.error(`❌ ${sliceDir} failed tests or type-checks.`);

    if (result.failedTestFiles.length) {
        console.log(`🧪 Failed test files:\n${result.failedTestFiles.join('\n')}`);
        if (result.testErrors) {
            console.log(`📝 Test errors:\n${result.testErrors}`);
        }
    }

    if (result.failedTypecheckFiles.length) {
        console.log(`📐 Failed typecheck files:\n${result.failedTypecheckFiles.join('\n')}`);
        if (result.typecheckErrors) {
            console.log(`📝 Typecheck errors:\n${result.typecheckErrors}`);
        }
    }
}