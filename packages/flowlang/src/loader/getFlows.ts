import createDebug from 'debug';
import { z } from 'zod';
import { SpecsSchema } from '../schema';
import { registry } from '../flow-registry';
import { messageRegistry } from '../message-registry';
import { integrationRegistry } from '../integration-registry';
import type { Flow } from '../index';
import type { Integration } from '../types';

import type { VfsLike } from '../vfs';
import { walk, filterByRegex } from '../vfs';

import { flowsToSchema } from './flow-to-schema';
import { loadEsbuild, vfsPlugin, importMapPlugin, execIndexModule } from './shared-build';
import { pathToFileURL } from 'url';

const debug = createDebug('flowlang:getFlows');
const debugImport = createDebug('flowlang:getFlows:import');
const debugIntegrations = createDebug('flowlang:getFlows:integrations');

const isBrowser = typeof window !== 'undefined' || typeof self !== 'undefined';
const isVitest =
  Boolean((globalThis as Record<string, unknown>).__vitest_worker__) ||
  Boolean((globalThis as Record<string, unknown>).__vite_ssr_import__);

const DEFAULT_PATTERN = /\.(flow|integration)\.(ts|js|mjs)$/;
const DEFAULT_IGNORE_DIRS = /(\/|^)(node_modules|dist|\.turbo|\.git)(\/|$)/;

function buildIndexSource(files: string[]): string {
  return files.map((f) => `export * from "${f.replace(/"/g, '\\"')}";`).join('\n');
}

export interface GetFlowsOptions {
  /** VFS to use for discovery and (in bundle mode) module resolution. If omitted in Node, NodeVfs is created automatically. */
  vfs?: VfsLike;
  /** Root directory (POSIX-like). In Node defaults to process.cwd(); in browser defaults to '/'. */
  root?: string;
  /** Regex to pick flow/integration files. */
  pattern?: RegExp;
  /** Import map for bundling (browser or bundle mode). */
  importMap?: Record<string, unknown>;
  /** Optional URL for esbuild-wasm in browser bundle mode. */
  esbuildWasmURL?: string;
  /** 'native' (Node dynamic import) or 'bundle' (esbuild/esbuild-wasm). Defaults to native in Node/Vitest; bundle in browser. */
  mode?: 'native' | 'bundle';
}

// eslint-disable-next-line complexity
export const getFlows = async (opts: GetFlowsOptions = {}) => {
  const {
    root = isBrowser ? '/' : typeof process !== 'undefined' ? process.cwd() : '/',
    pattern = DEFAULT_PATTERN,
    importMap = {},
    esbuildWasmURL,
    mode = isBrowser ? 'bundle' : isVitest ? 'native' : 'native',
  } = opts;

  // Always ensure we have a VFS — in Node we can synthesize one if not passed.
  let vfs: VfsLike | undefined = opts.vfs;
  if (!vfs && !isBrowser) {
    const { NodeVfs } = await import('../vfs/NodeVfs'); // lazy to avoid bundling in browser
    vfs = new NodeVfs();
  }
  if (!vfs) {
    throw new Error('getFlows: a VFS is required (browser) or could not be created (node).');
  }

  debug('Starting getFlows with root: %s, mode: %s', root, mode);

  // Reset registries
  registry.clearAll();
  messageRegistry.messages.clear();
  integrationRegistry.clear();

  // ------------------------------------------------------------------
  // Unified discovery via VFS in all environments
  // ------------------------------------------------------------------
  const all = await walk(vfs, root);
  const visible = all.filter((p) => !DEFAULT_IGNORE_DIRS.test(p));
  const files = filterByRegex(visible, pattern);

  debug('Discovered %d candidate files via VFS', files.length);
  debug('Files: %o', files);

  // ------------------------------------------------------------------
  // Execution strategy
  // ------------------------------------------------------------------
  if (mode === 'native' && !isBrowser) {
    // Node: import each discovered file natively.
    // Note: NodeVfs resolves the incoming POSIX paths to real absolute paths.
    for (const file of files) {
      const url = `${pathToFileURL(file).href}?t=${Date.now()}`;
      debugImport('Importing (native) %s', url);

      const mod = (await import(url)) as Record<string, unknown>;

      // Scan exports and register Integration branded objects
      for (const [exportName, exportValue] of Object.entries(mod)) {
        if (
          exportValue !== null &&
          typeof exportValue === 'object' &&
          '__brand' in (exportValue as Record<string, unknown>) &&
          (exportValue as { __brand?: string }).__brand === 'Integration'
        ) {
          debugIntegrations('Found integration %s in %s', exportName, file);
          integrationRegistry.register(exportValue as unknown as Integration);
        }
      }
    }
  } else {
    // Browser (or forced bundle mode in Node): bundle a virtual index that re-exports all files.
    const indexSource = buildIndexSource(files);
    const esbuild = await loadEsbuild(esbuildWasmURL);
    const plugins = [vfsPlugin(vfs), importMapPlugin(importMap)];

    const ns = await execIndexModule(esbuild, vfs, indexSource, '/virtual-index.ts', plugins);
    debugImport('Index executed; exported keys: %o', Object.keys(ns ?? {}));

    if (ns !== null && typeof ns === 'object') {
      for (const [exportName, exportValue] of Object.entries(ns)) {
        if (
          exportValue !== null &&
          typeof exportValue === 'object' &&
          '__brand' in (exportValue as Record<string, unknown>) &&
          (exportValue as { __brand?: string }).__brand === 'Integration'
        ) {
          debugIntegrations('Found integration %s in bundled export', exportName);
          integrationRegistry.register(exportValue as unknown as Integration);
        }
      }
    }
  }

  const flows: Flow[] = registry.getAllFlows();
  debug('After load - flows: %d, integrations: %d', flows.length, integrationRegistry.getAll().length);

  if (flows.length === 0) {
    debug('WARNING: No flows found after execution');
  }

  return {
    flows,
    toSchema: (): z.infer<typeof SpecsSchema> => flowsToSchema(flows),
  };
};
