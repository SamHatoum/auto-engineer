import fg from 'fast-glob';
import {runSlice} from "./runSlice.js";

export async function runAllSlices(baseDir: string): Promise<void> {
    const sliceDirs = await fg(`${baseDir}/**/*/`, { onlyDirectories: true });

    for (const sliceDir of sliceDirs) {
        const files = await fg(['*.ts'], { cwd: sliceDir });
        const targets = files.filter((f) => f.endsWith('state.ts') || f.endsWith('decide.ts') || f.endsWith('evolve.ts') || f.endsWith('react.ts') || f.endsWith('projection.ts'));

        for (const filename of targets) {
            await runSlice(sliceDir, filename);
        }
    }

    console.log('✅ All slice files processed');
}