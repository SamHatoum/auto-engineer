import createDebug from 'debug';
import type { Graph } from './types';
import type { IFileStore } from '@auto-engineer/file-store';
import { parseImports, parseTypeDefinitions, patchImportMeta, transpileToCjs, TypeInfo } from './ts-utils';
import { toPosix } from './fs-path';
import { resolveSpecifier } from './resolver';

const debug = createDebug('flow:graph');

export type BuildGraphResult = {
  graph: Graph;
  vfsFiles: string[];
  externals: string[]; // raw specifiers (e.g. "zod", "graphql-tag")
  importMap: Record<string, unknown>;
  typings: Record<string, string[]>; // absolute POSIX paths of .d.ts
  typeMap: Map<string, string>; // mapping from TypeScript type names to string literals
  typesByFile: Map<string, Map<string, TypeInfo>>; // mapping from file path to type definitions in that file
};

export async function buildGraph(
  entryFiles: string[],
  vfs: IFileStore,
  importMap: Record<string, unknown>,
  rootDir: string,
): Promise<BuildGraphResult> {
  const ts = await import('typescript');

  const graph: Graph = new Map();
  const visited = new Set<string>();

  const vfsFiles = new Set<string>();
  const externals = new Set<string>();
  const externalPkgs = new Set<string>();
  const pkgTypings = new Map<string, Set<string>>();
  const globalTypeMap = new Map<string, string>();
  const typesByFile = new Map<string, Map<string, TypeInfo>>();

  function basePackageOf(spec: string): string {
    if (spec.startsWith('@')) {
      const parts = spec.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
    }
    const i = spec.indexOf('/');
    return i === -1 ? spec : spec.slice(0, i);
  }

  async function buildRec(absPath: string): Promise<void> {
    const path = toPosix(absPath);
    if (visited.has(path)) return;
    visited.add(path);

    const buf = await vfs.read(path);
    if (!buf) {
      debug('missing in VFS: %s', path);
      return;
    }

    let source = new TextDecoder().decode(buf);
    source = patchImportMeta(source, path);

    const imports = parseImports(ts, path, source);
    const typeMap = parseTypeDefinitions(ts, path, source);

    // Store types by file and merge into global type map
    typesByFile.set(path, typeMap);
    for (const [typeName, typeInfo] of typeMap) {
      globalTypeMap.set(typeName, typeInfo.stringLiteral);
    }

    const resolved = new Map<string, import('./types').Resolved>();

    for (const spec of imports) {
      const r = await resolveSpecifier(vfs, spec, path, importMap);
      resolved.set(spec, r);
      if (r.kind === 'vfs') {
        await buildRec(r.path);
      } else if (r.kind === 'external') {
        externals.add(spec);
        const base = basePackageOf(spec);
        externalPkgs.add(base);
        debug('[externals] seen bare "%s" -> base "%s"', spec, base);
      }
    }

    const js = transpileToCjs(ts, path, source);
    graph.set(path, { js, imports, resolved });
    vfsFiles.add(path);
  }
  for (const entry of entryFiles) {
    await buildRec(toPosix(entry));
  }

  // ---- Typings discovery------------------------
  const normRoot = toPosix(rootDir).replace(/\/+$/, '');

  function toTypesAlias(pkg: string): string {
    // @scope/name  -> @types/scope__name
    // name         -> @types/name
    if (pkg.startsWith('@')) {
      const [scope, name] = pkg.split('/');
      return `@types/${scope.slice(1)}__${name}`;
    }
    return `@types/${pkg}`;
  }

  // Probe helpers (only check a few specific files)
  async function readJsonIfExists(path: string): Promise<Record<string, unknown> | null> {
    try {
      const buf = await vfs.read(path);
      if (!buf) return null;
      return JSON.parse(new TextDecoder().decode(buf)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async function exists(path: string): Promise<boolean> {
    try {
      const buf = await vfs.read(path);
      return !!buf;
    } catch {
      return false;
    }
  }

  // Find likely node_modules roots without crawling
  async function nodeModulesRoots(root: string): Promise<string[]> {
    const roots = new Set<string>();
    let cur = root;
    for (let i = 0; i < 8; i++) {
      const key = toPosix(cur);
      roots.add(`${key}/node_modules`);
      const parent = key.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/';
      if (parent === key) break;
      cur = parent;
    }
    // add server to roots
    roots.add(`${root}/server/node_modules`);

    // keep as candidates; later probes are cheap reads
    const out = [...roots].map(toPosix);
    debug('[typings] nm roots (no crawl): %o', out.slice(0, 5));
    return [...new Set(out)];
  }

  async function collectEntryDecl(nmRoot: string, pkg: string, out: Set<string>) {
    const pkgDir = `${nmRoot}/${pkg}`;

    // 1) package.json types/typings
    const pkgJson = await readJsonIfExists(`${pkgDir}/package.json`);
    if (pkgJson && (typeof pkgJson.types === 'string' || typeof pkgJson.typings === 'string')) {
      const decl = toPosix(`${pkgDir}/${String(pkgJson.types ?? pkgJson.typings)}`.replace(/\/+/g, '/'));
      out.add(decl);
      debug('[typings] %s: package.json -> %s', pkg, decl);
      return;
    }

    // 2) common fallback: index.d.ts at root
    const idx = `${pkgDir}/index.d.ts`;
    if (await exists(idx)) {
      out.add(toPosix(idx));
      debug('[typings] %s: fallback index.d.ts', pkg);
      return;
    }
  }

  async function tryDirectPackage(pkg: string, nmRoots: string[], out: Set<string>): Promise<boolean> {
    for (const nm of nmRoots) {
      await collectEntryDecl(nm, pkg, out);
      if (out.size) return true;
    }
    return false;
  }

  async function tryTypesAlias(pkg: string, nmRoots: string[], out: Set<string>): Promise<boolean> {
    const alias = toTypesAlias(pkg);
    for (const nm of nmRoots) {
      await collectEntryDecl(nm, alias, out);
      if (out.size) return true;
    }
    return false;
  }

  async function tryDistFallback(pkg: string, nmRoots: string[], out: Set<string>): Promise<boolean> {
    for (const nm of nmRoots) {
      const p = `${nm}/${pkg}/dist/index.d.ts`;
      if (await exists(p)) {
        out.add(toPosix(p));
        debug('[typings] %s: fallback dist/index.d.ts', pkg);
        return true;
      }
    }
    return false;
  }

  async function collectTypingsForPackage(pkg: string) {
    if (pkgTypings.has(pkg)) return;

    const out = new Set<string>();
    const nmRoots = await nodeModulesRoots(normRoot);
    debug('[typings] probing "%s" in nm roots: %o', pkg, nmRoots);

    const found =
      (await tryDirectPackage(pkg, nmRoots, out)) ||
      (await tryTypesAlias(pkg, nmRoots, out)) ||
      (await tryDistFallback(pkg, nmRoots, out));

    if (found) {
      pkgTypings.set(pkg, out);
      debug('[typings] ✅ %s: %d entry d.ts', pkg, out.size);
    } else {
      debug('[typings] ⚠ %s: no entry d.ts found (pkg or @types)', pkg);
    }
  }

  // Kick off typings discovery for all base external packages
  debug('[typings] packages to probe: %o', [...externalPkgs]);
  for (const pkg of externalPkgs) {
    await collectTypingsForPackage(pkg);
  }
  // ---------------------------------------------------------------------------

  const result: BuildGraphResult = {
    graph,
    vfsFiles: [...vfsFiles].sort(),
    externals: [...externals].sort(),
    importMap: { ...importMap },
    typings: Object.fromEntries([...pkgTypings.entries()].map(([k, v]) => [k, [...v].sort()])),
    typeMap: globalTypeMap,
    typesByFile,
  };

  debug(
    'graph built: modules=%d externals=%d packagesWithTypings=%d',
    graph.size,
    externals.size,
    Object.keys(result.typings).length,
  );
  debug('[typings] summary: %o', Object.fromEntries(Object.entries(result.typings).map(([k, v]) => [k, v.length])));

  return result;
}
