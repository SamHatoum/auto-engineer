import createDebug from 'debug';
import type { Graph } from './types';
import { dirname, toPosix } from './fs-path';
import { integrationRegistry } from '../integration-registry';
import { registry } from '../flow-registry';
import type { Integration } from '../types';

const debug = createDebug('flowlang:runtime');
const dImp = createDebug('flowlang:runtime:require');

function isIntegrationObject(x: unknown): x is Integration {
  return (
    Boolean(x) &&
    typeof x === 'object' &&
    x !== null &&
    '__brand' in (x as Record<string, unknown>) &&
    (x as { __brand: string }).__brand === 'Integration'
  );
}
function registerIntegrationsFrom(mod: unknown) {
  if (typeof mod !== 'object' || mod === null) return;
  for (const [, v] of Object.entries(mod as Record<string, unknown>)) {
    if (isIntegrationObject(v)) integrationRegistry.register(v);
  }
}

/**
 * Run a transpiled CJS graph
 * All non-VFS imports MUST be provided via the graph's resolved "mapped" entries (importMap).
 */
export function runGraph(entryFiles: string[], graph: Graph): void {
  const exportsCache = new Map<string, unknown>();

  function loadFromVfs(absPath: string) {
    const path = toPosix(absPath);

    // cycle-safe: if present, return (even if still initializing)
    if (exportsCache.has(path)) return exportsCache.get(path);

    const mod = graph.get(path);
    if (!mod) {
      throw new Error(`Module "${path}" not in graph. Make sure executeAST() included this file.`);
    }

    // seed cache BEFORE eval to break cycles
    const module = { exports: {} as Record<string, unknown> };
    exportsCache.set(path, module.exports);

    const __filename = path;
    const __dirname = dirname(path);

    const requireVfs = (spec: string): unknown => {
      dImp('[%s] require(%s)', path, spec);

      const r = mod.resolved.get(spec);
      if (!r) {
        // Not seen during graph build -> that’s a build/runtime mismatch.
        throw new Error(
          `Unresolved import "${spec}" from ${path}. ` +
            `All imports must be pre-resolved during graph build or provided via importMap.`,
        );
      }

      if (r.kind === 'mapped') return r.value;
      if (r.kind === 'vfs') return loadFromVfs(r.path);

      // 'external' must have been mapped earlier; never call native require
      throw new Error(`External "${r.spec}" is not mapped. Provide it via importMap when calling executeAST/getFlows.`);
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', mod.js) as (
        require: (s: string) => unknown,
        module: { exports: Record<string, unknown> },
        exports: Record<string, unknown>,
        __filename: string,
        __dirname: string,
      ) => void;

      fn(requireVfs, module, module.exports, __filename, __dirname);
      exportsCache.set(path, module.exports);
      registerIntegrationsFrom(module.exports);
      return module.exports as unknown;
    } catch (err) {
      debug('execution error in %s: %o', path, err);
      throw err;
    }
  }

  for (const entry of entryFiles) {
    loadFromVfs(entry);
  }

  debug('runGraph: flows=%d integrations=%d', registry.getAllFlows().length, integrationRegistry.getAll().length);
}
