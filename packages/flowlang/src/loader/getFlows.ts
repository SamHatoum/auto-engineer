import createDebug from 'debug';
import { z } from 'zod';
import { SpecsSchema } from '../schema';
import { registry } from '../flow-registry';
import { messageRegistry } from '../message-registry';
import { integrationRegistry } from '../integration-registry';
import type { Flow } from '../index';
import type { Integration } from '../types';

import { flowsToSchema } from './flow-to-schema';
import { loadEsbuild, vfsPlugin, execIndexModule } from './shared-build';
import { pathToFileURL } from 'url';
import type { FileStore } from '@auto-engineer/file-store';

const debug = createDebug('flowlang:getFlows');
const debugImport = createDebug('flowlang:getFlows:import');

const isBrowser = typeof window !== 'undefined' || typeof self !== 'undefined';
const DEFAULT_PATTERN = /\.(flow|integration)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const DEFAULT_IGNORE_DIRS = /(\/|^)(node_modules|dist|\.turbo|\.git)(\/|$)/;

export interface GetFlowsOptions {
  vfs?: FileStore;
  root?: string;
  pattern?: RegExp;
  importMap?: Record<string, unknown>;
  esbuildWasmURL?: string;
  mode?: 'native' | 'bundle';
}

const getDefaultRoot = () => (isBrowser ? '/' : typeof process !== 'undefined' ? process.cwd() : '/');
const getDefaultMode = (): 'native' | 'bundle' => (isBrowser ? 'bundle' : 'native');

function isIntegrationObject(x: unknown): x is Integration {
  return (
    Boolean(x) &&
    typeof x === 'object' &&
    x !== null &&
    '__brand' in x &&
    (x as { __brand?: string }).__brand === 'Integration'
  );
}

async function discoverFiles(vfs: FileStore, root: string, pattern: RegExp): Promise<string[]> {
  const entries = await vfs.listTree(root);
  const files = entries
    .filter((e) => e.type === 'file')
    .map((e) => e.path)
    .filter((p) => !DEFAULT_IGNORE_DIRS.test(p))
    .filter((p) => pattern.test(p));

  debug('discover: root=%s pattern=%s matched=%d', root, String(pattern), files.length);
  if (files.length <= 20) debug('discover: files=%o', files);
  return files;
}

async function executeNative(files: string[]) {
  debugImport('native: importing %d files', files.length);
  for (const file of files) {
    const url = `${pathToFileURL(file).href}?t=${Date.now()}`;
    const mod = (await import(url)) as Record<string, unknown>;
    for (const [, val] of Object.entries(mod)) if (isIntegrationObject(val)) integrationRegistry.register(val);
  }
}

async function createVfsIfNeeded(providedVfs?: FileStore): Promise<FileStore> {
  if (providedVfs) return providedVfs;
  if (!isBrowser) {
    return new (await import('@auto-engineer/file-store')).NodeFileStore();
  }
  throw new Error('getFlows: vfs is required in browser');
}

async function executeBundleMode(
  files: string[],
  vfs: FileStore,
  importMap: Record<string, unknown>,
  esbuildWasmURL?: string,
): Promise<void> {
  // Derive src prefix safely and consistently (no trailing slash)
  const firstDir = files.length ? files[0].replace(/\/[^/]*$/, '') : '';
  const srcDir = firstDir.includes('/src/') ? firstDir.slice(0, firstDir.indexOf('/src/') + 4) : '';
  const srcPrefix = srcDir.replace(/\/+$/, ''); // remove trailing slash

  // Import the live modules
  const flowMod = await import('../flow');
  const fluentMod = await import('../fluent-builder');
  const buildersMod = await import('../builders');
  const testingMod = await import('../testing');
  const dataFlowMod = await import('../data-flow-builders');
  const flowReg = await import('../flow-registry');
  const msgReg = await import('../message-registry');
  const intReg = await import('../integration-registry');

  // Build the map with normalized keys
  const mapKey = (rel: string) => `${srcPrefix}/${rel}`.replace(/\/{2,}/g, '/');

  const extendedMap: Record<string, unknown> = {
    ...importMap,
    [mapKey('flow')]: flowMod,
    [mapKey('fluent-builder')]: fluentMod,
    [mapKey('builders')]: buildersMod,
    [mapKey('testing')]: testingMod,
    [mapKey('data-flow-builders')]: dataFlowMod,
    [mapKey('flow-registry')]: flowReg,
    [mapKey('message-registry')]: msgReg,
    [mapKey('integration-registry')]: intReg,
  };

  debugImport('[bundle] map keys: %o', Object.keys(extendedMap));

  const esbuild = await loadEsbuild(esbuildWasmURL);
  const plugins = [vfsPlugin(vfs, extendedMap)];

  const indexSource = files.map((f) => `import "${f.replace(/"/g, '\\"')}";`).join('\n');

  try {
    const before = registry.getAllFlows().length;
    await execIndexModule(esbuild, vfs, indexSource, '/virtual-index.ts', plugins, extendedMap);
    const after = registry.getAllFlows().length;
    debugImport('bundle executed: flows before=%d after=%d', before, after);

    if (after === 0) {
      debugImport('bundle registered 0 flows; per-file fallback begins');
      for (const file of files) {
        try {
          const single = `import "${file.replace(/"/g, '\\"')}";`;
          await execIndexModule(esbuild, vfs, single, '/virtual-single.ts', plugins, extendedMap);
        } catch (err) {
          console.error(`[bundle:fallback] error in ${file}:`, err);
        }
      }
      debugImport('fallback done: flows=%d', registry.getAllFlows().length);
    }
  } catch (err) {
    console.error('[bundle] execIndexModule failed:', err);
    for (const file of files) {
      try {
        const single = `import "${file.replace(/"/g, '\\"')}";`;
        await execIndexModule(esbuild, vfs, single, '/virtual-single.ts', plugins, extendedMap);
      } catch (fileErr) {
        console.error(`[bundle:fallback-after-failure] error in ${file}:`, fileErr);
      }
    }
    debugImport('after failure fallback: flows=%d', registry.getAllFlows().length);
  }
}

export const getFlows = async (opts: GetFlowsOptions = {}) => {
  const {
    root = getDefaultRoot(),
    pattern = DEFAULT_PATTERN,
    importMap = {},
    esbuildWasmURL,
    mode = getDefaultMode(),
  } = opts;

  const vfs = await createVfsIfNeeded(opts.vfs);

  debug('start getFlows root=%s mode=%s', root, mode);

  registry.clearAll();
  messageRegistry.messages.clear();
  integrationRegistry.clear();

  const files = await discoverFiles(vfs, root, pattern);
  if (files.length === 0) {
    throw new Error(`getFlows: no candidate files found. root=${root} pattern=${String(pattern)}`);
  }

  if (mode === 'native' && !isBrowser) {
    await executeNative(files);
  } else {
    await executeBundleMode(files, vfs, importMap, esbuildWasmURL);
  }

  const flows: Flow[] = registry.getAllFlows();
  debug('flows after load = %d', flows.length);
  if (flows.length <= 20)
    debug(
      'flow names: %o',
      flows.map((f) => f.name),
    );

  return {
    flows,
    toSchema: (): z.infer<typeof SpecsSchema> => flowsToSchema(flows),
  };
};
