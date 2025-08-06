import fg from 'fast-glob';
import path from 'path';
import { runAllSlices } from './runAllSlices';

export async function runFlows(baseDir: string): Promise<void> {
  const flowDirs = await fg('*', {
    cwd: baseDir,
    onlyDirectories: true,
    absolute: true,
  });
  console.log(`🚀 Found ${flowDirs.length} flows`);
  for (const flowDir of flowDirs) {
    console.log(`📂 Processing flow: ${path.basename(flowDir)}`);
    await runAllSlices(flowDir);
  }

  console.log('✅ All flows processed');
}
