import fg from 'fast-glob';
import { runSlice } from './runSlice';
import path from 'path';

export async function runAllSlices(flowDir: string): Promise<void> {
  const flowName = path.basename(flowDir);
  const sliceDirs = await fg(`${flowDir}/**/*/`, { onlyDirectories: true });
  for (const sliceDir of sliceDirs) {
    await runSlice(sliceDir, flowName);
  }
  console.log('✅ All slices processed');
}
