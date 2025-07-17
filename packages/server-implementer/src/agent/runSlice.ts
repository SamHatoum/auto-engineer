import path from 'path';
import fg from 'fast-glob';
import {generateTextWithAI, getAvailableProviders} from '@auto-engineer/ai-gateway';
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

export async function runSlice(sliceDir: string): Promise<void> {
    console.log(`✏️ Implementing slice: ${sliceDir}`);
    const contextFiles = await loadContextFiles(sliceDir);
    const filesToImplement = Object.entries(contextFiles)
        .filter(([, content]) =>
            content.includes('TODO:') || content.includes('IMPLEMENTATION INSTRUCTIONS')
        );

    for (const [targetFile] of filesToImplement) {
        const filePath = path.join(sliceDir, targetFile);
        const prompt = buildInitialPrompt(targetFile, contextFiles);
        console.log(`🔮 [AI] Implementing ${targetFile}`);
        const aiOutput = await generateTextWithAI(prompt, AI_PROVIDER);
        const cleanedCode = extractCodeBlock(aiOutput);
        await writeFile(filePath, cleanedCode, 'utf-8');
        //console.log('✅ Updated file with clean up code:', filePath, cleanedCode);
        console.log(`♻ Implemented ${targetFile}`);
    }
    const success = await runTestsAndTypecheck(sliceDir);
    if (!success) {
         console.error(`❌ ${sliceDir} implementation failed tests or type-checks. Please check the logs.`);
    } else {
       console.log(`✅ All Tests and checks passed for: ${sliceDir}`);
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
Return only the whole updated file of ${targetFile}. Do not remove existing imports or types that are still referenced or required in the file. The file returned file has to be production ready.
`.trim();
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



export async function runTestsAndTypecheck(sliceDir: string): Promise<boolean> {
    try {
        const rootDir = await findProjectRoot(sliceDir);
        const testFiles = await fg(['*.spec.ts', '*.specs.ts'], {
            cwd: sliceDir,
            absolute: false,
        });

        if (testFiles.length === 0) {
            console.warn(`⚠️ No test files found in ${sliceDir}`);
        } else {
            const relativePaths = testFiles.map((f) => path.join(sliceDir, f).replace(`${rootDir}/`, ''));
            await execa('npx', ['vitest', 'run', ...relativePaths], {
                cwd: rootDir,
                stdio: 'inherit',
            });
        }

        const tsconfigPath = await findNearestTsconfig(sliceDir);
        const tsFiles = await fg(['*.ts'], {
            cwd: sliceDir,
            absolute: false,
        });

        if (tsFiles.length > 0) {
            const tsFilePaths = tsFiles.map((f) => path.join(sliceDir, f));
            await execa('npx', ['tsc', '--noEmit', '--project', tsconfigPath, ...tsFilePaths], {
                cwd: rootDir,
                stdio: 'inherit',
            });
        }

        return true;
    } catch {
        return false;
    }
}


async function findNearestTsconfig(startDir: string): Promise<string> {
    let dir = startDir;
    while (dir !== path.dirname(dir)) {
        const tsconfigPath = path.join(dir, 'tsconfig.json');
        try {
            await access(tsconfigPath);
            return tsconfigPath;
        } catch {
            dir = path.dirname(dir);
        }
    }
    throw new Error('❌ Could not find nearest tsconfig.json');
}

