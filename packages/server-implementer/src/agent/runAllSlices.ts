import fg from 'fast-glob';
import { runSlice } from './runSlice.js';

export async function runAllSlices(baseDir: string): Promise<void> {
    const sliceDirs = await fg(`${baseDir}/**/*/`, { onlyDirectories: true });

    for (const sliceDir of sliceDirs) {
        await runSlice(sliceDir);
    }

    console.log('✅ All slices processed');
}