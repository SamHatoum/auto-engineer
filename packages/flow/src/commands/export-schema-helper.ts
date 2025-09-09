import createDebug from 'debug';
import { getFs } from './filestore.node';
import { IExtendedFileStore, NodeFileStore } from '@auto-engineer/file-store';

const debug = createDebug('flow:export-schema-helper');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '4';
} // blue

const main = async () => {
  const directory = process.argv[2] || process.cwd();
  debug('Starting export-schema-helper with directory: %s', directory);

  try {
    // Import getFlows from the project's node_modules to ensure we use the same module context
    const getFileStore = getFs as () => Promise<IExtendedFileStore>;
    const fs: IExtendedFileStore = await getFileStore();
    const projectFlowPath = fs.join(directory, 'node_modules', '@auto-engineer', 'flow', 'dist', 'src', 'getFlows.js');
    debug('Importing getFlows from: %s', projectFlowPath);

    const { pathToFileURL } = await import('url');
    const flowModule = (await import(pathToFileURL(projectFlowPath).href)) as {
      getFlows: typeof import('../getFlows').getFlows;
    };
    const { getFlows } = flowModule;

    const flowsPath = fs.join(directory, 'flows');
    debug('Resolved flows path: %s', flowsPath);

    const result = await getFlows({ vfs: new NodeFileStore(), root: flowsPath });
    const schema = result.toModel();
    debug(
      'Schema generated with %d flows, %d messages, %d integrations',
      schema.flows.length,
      schema.messages.length,
      schema.integrations?.length ?? 0,
    );

    const json = JSON.stringify(schema, null, 2);
    const contextDir = fs.join(directory, '.context');
    const outPath = fs.join(contextDir, 'schema.json');

    await fs.ensureDir(contextDir);
    await fs.writeText(outPath, json);
    debug('Schema written to: %s', outPath);

    // Output success as JSON for parent process
    console.log(
      JSON.stringify({
        success: true,
        outputPath: outPath,
      }),
    );
  } catch (error) {
    debug('Error occurred: %o', error);

    // Output error as JSON for parent process
    console.log(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
    );
    process.exit(1);
  }
};

void main();
