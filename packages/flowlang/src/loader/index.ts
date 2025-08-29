import createDebug from 'debug';
import type { ExecuteOptions } from './types';
import { registry } from '../flow-registry';
import { integrationRegistry } from '../integration-registry';
import { buildGraph } from './graph';
import { runGraph } from './runtime-cjs';
import { createEnhancedImportMap } from './importmap';

const debug = createDebug('flowlang:ast-loader:index');

/** build TS graph, transpile to CJS, run with VFS require. */
export async function executeAST(
  entryFiles: ExecuteOptions['entryFiles'],
  vfs: ExecuteOptions['vfs'],
  importMap: ExecuteOptions['importMap'] = {},
): Promise<void> {
  registry.clearAll();
  integrationRegistry.clear();

  const enhanced = await createEnhancedImportMap(importMap);
  const graph = await buildGraph(entryFiles, vfs, enhanced);
  runGraph(entryFiles, graph);

  debug(
    'executeAST done. flows=%d integrations=%d',
    registry.getAllFlows().length,
    integrationRegistry.getAll().length,
  );
}
