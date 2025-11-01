import createDebug from 'debug';
import { registry } from './narrative-registry';
import type { Narrative, Model } from './index';
import { narrativesToModel } from './transformers/narrative-to-model';
import type { IFileStore } from '@auto-engineer/file-store';
import { executeAST } from './loader';
import { sha256 } from 'js-sha256';

const dirnamePosix = (p: string) => {
  const s = p.replace(/\/+$/, '');
  const i = s.lastIndexOf('/');
  return i > 0 ? s.slice(0, i) : '/';
};

const debug = createDebug('auto:narrative:getNarratives');

const toPosix = (p: string) => p.replace(/\\/g, '/');
const DEFAULT_PATTERN = /\.(narrative|integration)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const DEFAULT_IGNORE_DIRS = /(?:^|\/)(?:node_modules|dist|\.turbo|\.git)(?:\/|$)/;
const DTS_PATTERN = /\.d\.ts$/;
const CACHE_VERSION = 'v1';

function stableStringify(obj: Record<string, unknown>) {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(keys.reduce((a, k) => ((a[k] = obj[k]), a), {} as Record<string, unknown>));
}

function toUint8(view: ArrayBuffer | Uint8Array): Uint8Array {
  return view instanceof Uint8Array ? view : new Uint8Array(view);
}

async function hashFiles(vfs: IFileStore, files: string[]): Promise<string> {
  const sorted = [...new Set(files)].sort();
  const hasher = sha256.create();
  const enc = new TextEncoder();

  for (const f of sorted) {
    hasher.update(enc.encode(f));
    const buf = await vfs.read(f);
    if (buf) hasher.update(toUint8(buf));
  }

  return hasher.hex();
}

export interface GetNarrativesOptions {
  vfs: IFileStore;
  root: string;
  pattern?: RegExp;
  importMap?: Record<string, unknown>;
  fastFsScan?: boolean;
}

interface CacheEntry {
  result: {
    narratives: Narrative[];
    vfsFiles: string[];
    externals: string[];
    typings: Record<string, string[]>;
    typeMap: Map<string, string>;
    typesByFile: Map<string, Map<string, unknown>>;
    givenTypesByFile: Map<string, unknown[]>;
    toModel: () => Model;
  };
  contentHash: string;
}

const compilationCache = new Map<string, CacheEntry>();

async function discoverFiles(vfs: IFileStore, root: string, pattern: RegExp, fastScan: boolean): Promise<string[]> {
  const entries = await vfs.listTree(root, {
    includeSizes: false,
    followSymlinkDirs: !fastScan,
    pruneDirRegex: DEFAULT_IGNORE_DIRS,
  });
  const files = entries
    .filter((e) => e.type === 'file')
    .map((e) => toPosix(e.path))
    .filter((p) => !DEFAULT_IGNORE_DIRS.test(p))
    .filter((p) => !DTS_PATTERN.test(p))
    .filter((p) => pattern.test(p))
    .sort();

  debug('discover: root=%s pattern=%s matched=%d', root, String(pattern), files.length);
  return files;
}

async function validateCache(
  cached: CacheEntry,
  seedFiles: string[],
  vfs: IFileStore,
): Promise<CacheEntry['result'] | null> {
  const prevGraphFiles = cached.result.vfsFiles;
  const seedSet = new Set(seedFiles);
  const prevSet = new Set(prevGraphFiles);

  const hasNewFiles = seedFiles.some((f) => !prevSet.has(f));
  const hasRemovedFiles = prevGraphFiles.some((f) => !seedSet.has(f));

  if (hasNewFiles || hasRemovedFiles) {
    debug('cache invalidated (file list changed: +%d -%d)', hasNewFiles ? 1 : 0, hasRemovedFiles ? 1 : 0);
    return null;
  }

  const prevHash = await hashFiles(vfs, prevGraphFiles);
  if (prevHash === cached.contentHash) {
    debug('cache hit (graph unchanged)');
    return cached.result;
  }
  debug('cache invalidated (graph changed)');
  return null;
}

export const getNarratives = async (
  opts: GetNarrativesOptions,
): Promise<{
  narratives: Narrative[];
  vfsFiles: string[];
  externals: string[];
  typings: Record<string, string[]>;
  typeMap: Map<string, string>;
  typesByFile: Map<string, Map<string, unknown>>;
  givenTypesByFile: Map<string, unknown[]>;
  toModel: () => Model;
}> => {
  const { vfs, root, pattern = DEFAULT_PATTERN, importMap = {} } = opts;
  const normRoot = toPosix(root);
  const projectRoot = dirnamePosix(normRoot);

  const seedFiles = await discoverFiles(
    vfs,
    normRoot,
    pattern,
    opts.fastFsScan === undefined ? false : opts.fastFsScan,
  );
  if (seedFiles.length === 0) {
    debug('no candidate files found. root=%s pattern=%s', normRoot, String(pattern));
    return {
      narratives: [],
      vfsFiles: [],
      externals: [],
      typings: {},
      typeMap: new Map(),
      typesByFile: new Map(),
      givenTypesByFile: new Map(),
      toModel: () => ({ variant: 'specs' as const, narratives: [], messages: [] }),
    };
  }

  const cacheKey = [CACHE_VERSION, normRoot, String(pattern), stableStringify(importMap)].join('|');
  const cached = compilationCache.get(cacheKey);

  if (cached) {
    const cachedResult = await validateCache(cached, seedFiles, vfs);
    if (cachedResult) {
      return cachedResult;
    }
  }
  registry.clearAll();

  const exec = await executeAST(seedFiles, vfs, importMap, projectRoot);

  const narratives: Narrative[] = registry.getAllNarratives();
  const result = {
    narratives,
    vfsFiles: exec.vfsFiles, // absolute posix paths of all VFS modules in the graph
    externals: exec.externals, // external specifiers used
    typings: exec.typings, // { pkgName: [abs d.ts paths] }
    typeMap: exec.typeMap, // mapping from TypeScript type names to string literals
    typesByFile: exec.typesByFile, // mapping from file path to type definitions in that file
    givenTypesByFile: exec.givenTypesByFile, // mapping from file path to given type info
    toModel: (): Model => narrativesToModel(narratives, exec.typesByFile),
  };

  const contentHash = await hashFiles(vfs, exec.vfsFiles);

  compilationCache.set(cacheKey, { result, contentHash });
  debug('cached compilation result, hash=%s', contentHash.slice(0, 8));

  return result;
};

export const clearGetNarrativesCache = (): void => {
  compilationCache.clear();
  debug('cleared compilation cache');
};
