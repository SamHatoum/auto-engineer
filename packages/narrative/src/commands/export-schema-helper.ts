import createDebug from 'debug';
import { getFs } from './filestore.node';
import { IExtendedFileStore, NodeFileStore } from '@auto-engineer/file-store/node';

const debug = createDebug('auto:narrative:export-schema-helper');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '4';
} // blue

const main = async () => {
  const directory = process.argv[2] || process.cwd();
  debug('Starting export-schema-helper with directory: %s', directory);

  try {
    const getFileStore = getFs as () => Promise<IExtendedFileStore>;
    const fs: IExtendedFileStore = await getFileStore();
    const projectNarrativePath = fs.join(
      directory,
      'node_modules',
      '@auto-engineer',
      'narrative',
      'dist',
      'src',
      'getNarratives.js',
    );
    debug('Importing getNarratives from: %s', projectNarrativePath);

    const { pathToFileURL } = await import('url');
    const narrativeModule = (await import(pathToFileURL(projectNarrativePath).href)) as {
      getNarratives: typeof import('../getNarratives').getNarratives;
    };
    const { getNarratives } = narrativeModule;

    const narrativesPath = fs.join(directory, 'narratives');
    debug('Resolved narratives path: %s', narrativesPath);

    const result = await getNarratives({ vfs: new NodeFileStore(), root: narrativesPath });
    const schema = result.toModel();
    debug(
      'Schema generated with %d narratives, %d messages, %d integrations',
      schema.narratives.length,
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
