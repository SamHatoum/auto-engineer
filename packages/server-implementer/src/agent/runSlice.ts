import path from "path";
import fg from 'fast-glob';
import {generateTextWithAI, getAvailableProviders} from "@auto-engineer/ai-gateway";
import { readFile, writeFile, access } from 'fs/promises';
import {execa} from "execa";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import {extractCodeBlock} from "../utils/extractCodeBlock";

const availableProviders = getAvailableProviders();
const AI_PROVIDER = availableProviders[0];

if (availableProviders.length === 0) {
    console.error('❌ No AI providers configured. Please set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or XAI_API_KEY');
    process.exit(1);
}

export async function runSlice(sliceDir: string, targetFile: string): Promise<void> {
    const filePath = path.join(sliceDir, targetFile);
    const filesInSlice = await fg(['*.ts'], { cwd: sliceDir });

    const contextFiles: Record<string, string> = {};
    for (const f of filesInSlice) {
        const absPath = path.join(sliceDir, f);
        contextFiles[f] = await readFile(absPath, 'utf-8');
    }

    const prompt = `
${SYSTEM_PROMPT}

---
📄 Target file to implement: ${targetFile}

${contextFiles[targetFile]}

---
🧠 Other files in the same slice:
${Object.entries(contextFiles)
        .filter(([name]) => name !== targetFile)
        .map(([name, content]) => `// File: ${name}\n${content}`)
        .join('\n\n')}

---
Return only the updated content of ${targetFile}.
  `;

    const aiOutput = await generateTextWithAI(prompt, AI_PROVIDER);
    const cleanedCode = extractCodeBlock(aiOutput);
    await writeFile(filePath, cleanedCode, 'utf-8');
    console.log(`✅ Updated: ${filePath}`);

    try {
        let projectRoot = sliceDir;
        while (projectRoot !== path.dirname(projectRoot)) {
            try {
                await access(path.join(projectRoot, 'package.json'));
                break;
            } catch {
                projectRoot = path.dirname(projectRoot);
            }
        }

        await execa('npx', ['vitest', 'run'], {
            cwd: projectRoot,
            stdio: 'inherit',
        });

        await execa('npx', ['tsc', '--noEmit'], {
            cwd: projectRoot,
            stdio: 'inherit',
        });
        console.log(`✅ Tests and types passed for: ${targetFile}`);
    } catch {
        console.warn(`❌ Tests or types failed for: ${targetFile}`);

        const retryPrompt = `
${SYSTEM_PROMPT}

---
The previous implementation of ${targetFile} caused test or type-check failures.

Please regenerate the correct implementation using the instructions only.

📄 File to fix: ${targetFile}

${contextFiles[targetFile]}

🧠 Other files:
${Object.entries(contextFiles)
            .filter(([name]) => name !== targetFile)
            .map(([name, content]) => `// File: ${name}\n${content}`)
            .join('\n\n')}

Return only the corrected content of ${targetFile}, no commentary, no markdown.
`;

        const retryOutput = await generateTextWithAI(retryPrompt, AI_PROVIDER);
        const retryCleaned = extractCodeBlock(retryOutput);
        await writeFile(filePath, retryCleaned, 'utf-8');
        console.log(`♻️ Retried and updated: ${filePath}`);
    }
}