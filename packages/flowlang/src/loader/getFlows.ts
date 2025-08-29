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
import type { IFileStore } from '@auto-engineer/file-store';

const debug = createDebug('flowlang:getFlows');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '6';
} // cyan
const debugImport = createDebug('flowlang:getFlows:import');
if ('color' in debugImport && typeof debugImport === 'object') {
  (debugImport as { color: string }).color = '4';
} // blue
const debugError = createDebug('flowlang:getFlows:error');
if ('color' in debugError && typeof debugError === 'object') {
  (debugError as { color: string }).color = '3';
} // yellow

const isBrowser = typeof window !== 'undefined' || typeof self !== 'undefined';
const DEFAULT_PATTERN = /\.(flow|integration)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const DEFAULT_IGNORE_DIRS = /(\/|^)(node_modules|dist|\.turbo|\.git)(\/|$)/;

export interface GetFlowsOptions {
  vfs?: IFileStore;
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

async function discoverFiles(vfs: IFileStore, root: string, pattern: RegExp): Promise<string[]> {
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
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('getFlows: native mode is only supported in Node.js');
  }
  const { pathToFileURL } = await import('node:url');
  debugImport('native: importing %d files', files.length);
  for (const file of files) {
    const url = `${pathToFileURL(file).href}?t=${Date.now()}`;
    const mod = (await import(url)) as Record<string, unknown>;
    for (const [, val] of Object.entries(mod)) if (isIntegrationObject(val)) integrationRegistry.register(val);
  }
}

async function createVfsIfNeeded(providedVfs?: IFileStore): Promise<IFileStore> {
  if (providedVfs) return providedVfs;
  if (!isBrowser) {
    return new (await import('@auto-engineer/file-store')).NodeFileStore();
  }
  throw new Error('getFlows: vfs is required in browser');
}

async function executeBundleMode(
  files: string[],
  vfs: IFileStore,
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
          debugError('[bundle:fallback] error in %s: %O', file, err);
        }
      }
      debugImport('fallback done: flows=%d', registry.getAllFlows().length);
    }
  } catch (err) {
    debugError('[bundle] execIndexModule failed: %O', err);
    for (const file of files) {
      try {
        const single = `import "${file.replace(/"/g, '\\"')}";`;
        await execIndexModule(esbuild, vfs, single, '/virtual-single.ts', plugins, extendedMap);
      } catch (fileErr) {
        debugError('[bundle:fallback-after-failure] error in %s: %O', file, fileErr);
      }
    }
    debugImport('after failure fallback: flows=%d', registry.getAllFlows().length);

    // If bundle mode completely failed to load any flows, throw to trigger native fallback
    if (registry.getAllFlows().length === 0) {
      throw new Error('Bundle mode failed to load any flows');
    }
  }
}

async function executeFiles(
  files: string[],
  vfs: IFileStore,
  importMap: Record<string, unknown>,
  esbuildWasmURL: string | undefined,
  mode: 'native' | 'bundle',
): Promise<void> {
  if (mode === 'native' && !isBrowser) {
    await executeNative(files);
  } else {
    try {
      await executeBundleMode(files, vfs, importMap, esbuildWasmURL);
    } catch (err) {
      debugImport('bundle mode failed, falling back to native mode: %o', err);
      if (!isBrowser) {
        await executeNative(files);
      } else {
        throw err;
      }
    }
  }
}

function logFlowResults(flows: Flow[]): void {
  debug('flows after load = %d', flows.length);
  if (flows.length <= 20) {
    debug(
      'flow names: %o',
      flows.map((f) => f.name),
    );
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
  debug('getFlows called, stack: %s', new Error().stack);

  registry.clearAll();
  messageRegistry.messages.clear();
  integrationRegistry.clear();

  const files = await discoverFiles(vfs, root, pattern);
  if (files.length === 0) {
    throw new Error(`getFlows: no candidate files found. root=${root} pattern=${String(pattern)}`);
  }

  await executeFiles(files, vfs, importMap, esbuildWasmURL, mode);

  const flows: Flow[] = registry.getAllFlows();
  logFlowResults(flows);

  return {
    flows,
    toSchema: (): z.infer<typeof SpecsSchema> => flowsToSchema(flows),
  };
};
