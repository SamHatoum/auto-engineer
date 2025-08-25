// src/orchestration/shared-build.ts
import type { VfsLike } from '../vfs';

const isBrowser = typeof window !== 'undefined' || typeof self !== 'undefined';

// Minimal esbuild type definitions
interface EsbuildOnResolveArgs {
  path: string;
  resolveDir?: string;
  namespace?: string;
}

interface EsbuildOnResolveResult {
  path: string;
  namespace?: string;
}

interface EsbuildOnLoadArgs {
  path: string;
  namespace?: string;
}

interface EsbuildOnLoadResult {
  contents: string;
  loader?: 'ts' | 'tsx' | 'js' | 'jsx';
  resolveDir?: string;
}

interface EsbuildPlugin {
  name: string;
  setup(build: {
    onResolve(
      opts: { filter: RegExp; namespace?: string },
      callback: (args: EsbuildOnResolveArgs) => EsbuildOnResolveResult | undefined,
    ): void;
    onLoad(
      opts: { filter: RegExp; namespace?: string },
      callback: (args: EsbuildOnLoadArgs) => Promise<EsbuildOnLoadResult> | EsbuildOnLoadResult,
    ): void;
  }): void;
}

interface EsbuildBuildOptions {
  entryPoints?: string[];
  stdin?: {
    contents: string;
    resolveDir: string;
    sourcefile: string;
    loader: string;
  };
  bundle: boolean;
  write: boolean;
  format: string;
  platform: string;
  sourcemap: string;
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

export type EsbuildModule = EsbuildNodeModule | EsbuildWasmModule;

export async function loadEsbuild(wasmURL?: string): Promise<EsbuildModule> {
  if (isBrowser) {
    const esbuild = (await import('esbuild-wasm')) as unknown as EsbuildWasmModule;
    if ('initialize' in esbuild && typeof esbuild.initialize === 'function') {
      try {
        await esbuild.initialize({ wasmURL: wasmURL ?? '/esbuild.wasm', worker: true });
      } catch {
        // ignore "already initialized"
      }
    }
    return esbuild;
  }
  const esbuild = (await import('esbuild')) as unknown as EsbuildNodeModule;
  return esbuild;
}

export function vfsPlugin(vfs: VfsLike): EsbuildPlugin {
  return {
    name: 'vfs',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args: EsbuildOnResolveArgs) => {
        if (!args.path.startsWith('.') && !args.path.startsWith('/')) return undefined;
        const base = args.resolveDir ?? '/';
        const join = (a: string, b: string) => (a.endsWith('/') ? a.slice(0, -1) : a) + '/' + b.replace(/^\/+/, '');
        const normalized = args.path.startsWith('/') ? args.path : join(base, args.path);
        return { path: normalized.replace(/\\/g, '/'), namespace: 'vfs' };
      });

      build.onLoad({ filter: /.*/, namespace: 'vfs' }, async (args: EsbuildOnLoadArgs) => {
        const contents = await vfs.readFile(args.path, 'utf8');
        const match = args.path.replace(/\/[^/]*$/, '');
        const resolveDir = match.length > 0 ? match : '/';
        const pathParts = args.path.split('.');
        const ext = (pathParts.length > 1 ? pathParts.pop() : 'ts') as 'ts' | 'tsx' | 'js' | 'jsx';
        return { contents, loader: ext, resolveDir };
      });
    },
  };
}

export function importMapPlugin(importMap: Record<string, unknown>): EsbuildPlugin {
  return {
    name: 'import-map',
    setup(build) {
      const NS = 'importmap';
      build.onResolve({ filter: /.*/ }, (args: EsbuildOnResolveArgs) => {
        if (args.path in importMap) return { path: args.path, namespace: NS };
        return undefined;
      });
      build.onLoad({ filter: /.*/, namespace: NS }, (args: EsbuildOnLoadArgs) => {
        const mod = importMap[args.path];
        const keys = Object.keys(mod ?? {});
        const lines = keys.map((k) => `export const ${k} = __m["${k}"];`);
        const contents = `const __m = (${JSON.stringify(mod)});\n${lines.join('\n')}\nexport default __m;`;
        return { contents, loader: 'js' };
      });
    },
  };
}

/**
 * Build the provided "index module" source and import it.
 * Returns the namespace object so callers can scan for Integration exports.
 */
export async function execIndexModule(
  esbuild: EsbuildModule,
  _vfs: VfsLike,
  indexSource: string,
  virtualFilename: string,
  plugins: EsbuildPlugin[],
): Promise<unknown> {
  const result = await esbuild.build({
    stdin: {
      contents: indexSource,
      resolveDir: '/',
      sourcefile: virtualFilename,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    sourcemap: 'inline',
    plugins,
  });

  const js: string = result.outputFiles[0].text;

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
