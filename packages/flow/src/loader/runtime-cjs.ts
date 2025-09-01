import { createRequire } from 'module';
import createDebug from 'debug';
import type { Graph } from './types';
import { dirname, toPosix } from './fs-path';
import { integrationRegistry } from '../integration-registry';
import { registry } from '../flow-registry';
import type { Integration } from '../types';

const debug = createDebug('flow:runtime');
const dImp = createDebug('flow:runtime:require');

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

export function runGraph(entryFiles: string[], graph: Graph): void {
  const exportsCache = new Map<string, unknown>();

  function loadFromVfs(absPath: string) {
    const path = toPosix(absPath);
    if (exportsCache.has(path)) return exportsCache.get(path);

    const mod = graph.get(path);
    if (!mod) throw new Error(`Module "${path}" not in graph. Make sure executeAST() included this file.`);

    const module = { exports: {} as Record<string, unknown> };
    exportsCache.set(path, module.exports);

    const __filename = path;
    const __dirname = dirname(path);

    const requireVfs = (spec: string): unknown => {
      dImp('[%s] require(%s)', path, spec);
      const r = mod.resolved.get(spec);

      if (!r) {
        // Not seen during build – fall back to Node from workspace root.
        const nodeRequire = createRequire(process.cwd() + '/index.js');
        return nodeRequire(spec);
      }

      if (r.kind === 'mapped') return r.value;
      if (r.kind === 'vfs') return loadFromVfs(r.path);

      // r.kind === 'external' => try Node require from workspace root first,
      // then plain require as a last resort.
      try {
        const nodeRequire = createRequire(process.cwd() + '/index.js');
        return nodeRequire(r.spec);
      } catch (e2) {
        throw new Error(
          `External "${r.spec}" could not be resolved via Node. ` +
            `Install it (pnpm add ${r.spec}) or map it via importMap. (${(e2 as Error).message})`,
        );
      }
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', mod.js) as (
        req: (s: string) => unknown,
        module: { exports: Record<string, unknown> },
        exports: Record<string, unknown>,
        __filename: string,
        __dirname: string,
      ) => void;

      fn(requireVfs, module, module.exports, __filename, __dirname);
      exportsCache.set(path, module.exports);
      registerIntegrationsFrom(module.exports);
      return module.exports;
    } catch (err) {
      debug('execution error in %s: %o', path, err);
      throw err;
    }
  }

  for (const entry of entryFiles) loadFromVfs(entry);
  debug('runGraph: flows=%d integrations=%d', registry.getAllFlows().length, integrationRegistry.getAll().length);
}
