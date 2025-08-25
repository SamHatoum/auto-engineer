import type { FileStore } from '../fs';

const isBrowser = typeof window !== 'undefined' || typeof self !== 'undefined';
const GLOBAL_MAP_NAME = '__flowlangImportMap__';

interface EsbuildOnResolveArgs {
  path: string;
  importer: string;
  resolveDir?: string;
  namespace: string;
}
interface EsbuildOnResolveResult {
  path: string;
  namespace?: string;
}
interface EsbuildOnLoadArgs {
  path: string;
  namespace: string;
}
type EsbuildLoader = 'ts' | 'tsx' | 'js' | 'jsx';
interface EsbuildOnLoadResult {
  contents: string;
  loader?: EsbuildLoader;
  resolveDir?: string;
}
interface EsbuildPlugin {
  name: string;
  setup(build: {
    onResolve(
      opts: { filter: RegExp; namespace?: string },
      cb: (
        args: EsbuildOnResolveArgs,
      ) => EsbuildOnResolveResult | undefined | Promise<EsbuildOnResolveResult | undefined>,
    ): void;
    onLoad(
      opts: { filter: RegExp; namespace?: string },
      cb: (args: EsbuildOnLoadArgs) => EsbuildOnLoadResult | Promise<EsbuildOnLoadResult>,
    ): void;
  }): void;
}
interface EsbuildBuildOptions {
  entryPoints?: string[];
  stdin?: { contents: string; resolveDir: string; sourcefile: string; loader: string };
  bundle: boolean;
  write: boolean;
  format: 'esm';
  platform: 'browser' | 'node';
  sourcemap: 'inline' | 'external' | 'none';
  plugins?: EsbuildPlugin[];
}
interface EsbuildBuildResult {
  outputFiles: Array<{ text: string }>;
}
interface EsbuildWasmModule {
  initialize(opts: { wasmURL: string; worker?: boolean }): Promise<void>;
  build(options: EsbuildBuildOptions): Promise<EsbuildBuildResult>;
}
interface EsbuildNodeModule {
  build(options: EsbuildBuildOptions): Promise<EsbuildBuildResult>;
}
export type EsbuildModule = EsbuildWasmModule | EsbuildNodeModule;

// ---- helpers ----
const toPosix = (p: string) => p.replace(/\\/g, '/');

const normalizePosix = (p: string): string => {
  const abs = p.startsWith('/') ? p : '/' + p;
  const out: string[] = [];
  for (const seg of abs.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return '/' + out.join('/');
};

const resolveAbs = (baseDir: string, spec: string): string => {
  const base = baseDir && baseDir !== '/' ? baseDir : '/';
  return normalizePosix(spec.startsWith('/') ? spec : base.endsWith('/') ? base + spec : base + '/' + spec);
};

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const INDEX_CANDIDATES = EXTENSIONS.map((e) => '/index' + e);

const toLoader = (ext: string): EsbuildLoader => {
  switch (ext) {
    case '.ts':
      return 'ts';
    case '.tsx':
      return 'tsx';
    case '.jsx':
      return 'jsx';
    case '.js':
    case '.mjs':
    case '.cjs':
    default:
      return 'js';
  }
};

async function resolveVfsModulePath(
  vfs: FileStore,
  p: string,
): Promise<{ path: string; loader: EsbuildLoader } | null> {
  const hasExt = /\.[a-zA-Z0-9]+$/.test(p);

  if (hasExt) {
    const file = await vfs.read(p);
    if (file) return { path: p, loader: toLoader(p.slice(p.lastIndexOf('.')).toLowerCase()) };
  } else {
    for (const ext of EXTENSIONS) {
      const cand = p + ext;
      const file = await vfs.read(cand);
      if (file) return { path: cand, loader: toLoader(ext) };
    }
  }

  for (const idx of INDEX_CANDIDATES) {
    const cand = (p.endsWith('/') ? p.slice(0, -1) : p) + idx;
    const file = await vfs.read(cand);
    if (file) return { path: cand, loader: toLoader(cand.slice(cand.lastIndexOf('.')).toLowerCase()) };
  }

  return null;
}

// ---- esbuild loader ----
export async function loadEsbuild(wasmURL?: string): Promise<EsbuildModule> {
  if (isBrowser) {
    const esbuild = (await import('esbuild-wasm')) as unknown as EsbuildWasmModule;
    if ('initialize' in esbuild) {
      try {
        await esbuild.initialize({ wasmURL: wasmURL ?? '/esbuild.wasm', worker: true });
      } catch {
        /* already initialized */
      }
    }
    return esbuild;
  }
  return (await import('esbuild')) as unknown as EsbuildNodeModule;
}

/**
 * VFS resolver/loader + import map.
 * Import-mapped modules are emitted as tiny “re-export” shims that read from
 * `globalThis[GLOBAL_MAP_NAME][spec]`, which we populate at runtime.
 */
export function vfsPlugin(vfs: FileStore, importMap: Record<string, unknown> = {}): EsbuildPlugin {
  const NS = 'vfs';
  const hasMap = (p: string) => Object.prototype.hasOwnProperty.call(importMap, p);

  return {
    name: 'vfs',
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        // bare specifiers → let esbuild handle (node_modules etc.)
        if (!args.path.startsWith('.') && !args.path.startsWith('/')) return;

        const base = args.resolveDir ?? '/';
        const normalized = resolveAbs(base, toPosix(args.path));

        if (hasMap(normalized)) return { path: normalized, namespace: NS };

        const cand = await resolveVfsModulePath(vfs, normalized);
        if (cand) return { path: cand.path, namespace: NS };

        return;
      });

      build.onLoad({ filter: /.*/, namespace: NS }, async (args) => {
        if (hasMap(args.path)) {
          // Live re-exports from the global map (no JSON serialization!)
          const moduleData = importMap[args.path] as Record<string, unknown> | undefined;
          const keys = Object.keys(moduleData ?? {});
          const reexports = keys.map((k) => `export const ${k} = __m["${k}"];`).join('\n');
          const contents =
            `const __g = globalThis;\n` +
            `if (!(__g as any)["${GLOBAL_MAP_NAME}"]) (__g as any)["${GLOBAL_MAP_NAME}"] = Object.create(null);\n` +
            `const __m = (__g as any)["${GLOBAL_MAP_NAME}"]["${args.path}"];\n` +
            `${reexports}\n` +
            `export default __m;`;
          return { contents, loader: 'ts', resolveDir: args.path.replace(/\/[^/]*$/, '') || '/' };
        }

        const buf = await vfs.read(args.path);
        if (!buf) throw new Error(`File not found: ${args.path}`);
        const contents = new TextDecoder().decode(buf);
        const ext = args.path.slice(args.path.lastIndexOf('.')).toLowerCase();
        return { contents, loader: toLoader(ext), resolveDir: args.path.replace(/\/[^/]*$/, '') || '/' };
      });
    },
  };
}

/**
 * Build and execute `indexSource`. We allow passing `liveImportMap` so the
 * synthetic modules can read live objects (functions, singletons) via globalThis.
 */
export async function execIndexModule(
  esbuild: EsbuildModule,
  _vfs: FileStore,
  indexSource: string,
  virtualFilename: string,
  plugins: EsbuildPlugin[],
  liveImportMap?: Record<string, unknown>, // ← NEW
): Promise<unknown> {
  const result = await esbuild.build({
    stdin: { contents: indexSource, resolveDir: '/', sourcefile: virtualFilename, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: isBrowser ? 'browser' : 'node',
    sourcemap: 'inline',
    plugins,
  });

  const js: string = result.outputFiles[0].text;

  // Install live map for the re-export shims
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  (globalThis as any)[GLOBAL_MAP_NAME] = liveImportMap ?? (globalThis as any)[GLOBAL_MAP_NAME] ?? Object.create(null);

  if (isBrowser) {
    const blob = new Blob([js], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      return await import(/* @vite-ignore */ url);
    } finally {
      URL.revokeObjectURL(url);
    }
  } else {
    const { Buffer } = await import('node:buffer');
    const dataUrl = 'data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64');
    return await import(dataUrl);
  }
}
