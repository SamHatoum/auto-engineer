import fg from 'fast-glob';
import path from 'path';
import { runAllSlices } from './runAllSlices';
import createDebug from 'debug';

const debug = createDebug('server-impl:flows');
const debugFlow = createDebug('server-impl:flows:flow');

export async function runFlows(baseDir: string): Promise<void> {
  debug('Running flows from base directory: %s', baseDir);

  const flowDirs = await fg('*', {
    cwd: baseDir,
    onlyDirectories: true,
    absolute: true,
  });

  debug('Found %d flow directories', flowDirs.length);
  if (flowDirs.length > 0) {
    debug(
      'Flow directories: %o',
      flowDirs.map((d) => path.basename(d)),
    );
  }

  console.log(`🚀 Found ${flowDirs.length} flows`);
  for (const flowDir of flowDirs) {
    const flowName = path.basename(flowDir);
    debugFlow('Processing flow: %s', flowName);
    debugFlow('  Path: %s', flowDir);

    console.log(`📂 Processing flow: ${flowName}`);

    try {
      await runAllSlices(flowDir);
      debugFlow('Flow %s completed successfully', flowName);
    } catch (error) {
      debugFlow('ERROR: Flow %s failed: %O', flowName, error);
      throw error;
    }
  }

  debug('All %d flows processed successfully', flowDirs.length);
  console.log('✅ All flows processed');
}
