import createDebug from 'debug';
import type { ExecuteOptions } from './types';
import { registry } from '../narrative-registry';
import { integrationRegistry } from '../integration-registry';
import { integrationExportRegistry } from '../integration-export-registry';
import { buildGraph, type BuildGraphResult } from './graph';
import { runGraph } from './runtime-cjs';
import { createEnhancedImportMap } from './importmap';
import { setGivenTypesByFile } from '../narrative-context';

const debug = createDebug('auto:flow:ast-loader:index');

export type ExecuteResult = BuildGraphResult & {
  flowsCount: number;
  integrationsCount: number;
};

function interopDefault(mod: unknown): unknown {
  const m = mod as Record<string, unknown> | null;
  // If it's an ESM namespace, prefer .default. Node’s ESM->CJS interop
  // sets default=module.exports for CJS packages like axios.
  return m !== null && typeof m === 'object' && 'default' in m ? (m.default ?? m) : m;
}

/** Build TS graph, transpile to CJS, auto-map externals, run, and return graph + metadata. */
export async function executeAST(
  entryFiles: ExecuteOptions['entryFiles'],
  vfs: ExecuteOptions['vfs'],
  importMap: ExecuteOptions['importMap'] = {},
  rootDir: string,
): Promise<ExecuteResult> {
  registry.clearAll();
  integrationRegistry.clear();
  integrationExportRegistry.clear();

  // seed with built-ins (browser-safe shims included)
  let enhanced = await createEnhancedImportMap(importMap);

  // 1st pass: discover externals
  const first = await buildGraph(entryFiles, vfs, enhanced, rootDir);

  // auto-map any externals we can load
  const autoMapped: Record<string, unknown> = {};
  for (const spec of first.externals) {
    if (Object.prototype.hasOwnProperty.call(enhanced, spec)) continue;
    try {
      const mod = (await import(spec)) as Record<string, unknown>;
      autoMapped[spec] = interopDefault(mod); // <<< IMPORTANT
      debug('auto-mapped external: %s', spec);
    } catch {
      /* ignore */
    }
  }

  let final: BuildGraphResult;
  if (Object.keys(autoMapped).length > 0) {
    enhanced = { ...enhanced, ...autoMapped };
    final = await buildGraph(entryFiles, vfs, enhanced, rootDir);
  } else {
    final = first;
  }

  // Set given types before running graph so flow-context can use them
  setGivenTypesByFile(final.givenTypesByFile);

  runGraph(entryFiles, final.graph);

  const flowsCount = registry.getAllNarratives().length;
  const integrationsCount = integrationRegistry.getAll().length;

  debug(
    'executeAST done. modules=%d flows=%d integrations=%d externals=%d automapped=%d',
    final.graph.size,
    flowsCount,
    integrationsCount,
    final.externals.length,
    Object.keys(autoMapped).length,
  );

  return { ...final, flowsCount, integrationsCount };
}
