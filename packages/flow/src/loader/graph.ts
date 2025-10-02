import createDebug from 'debug';
import type { Graph } from './types';
import type { IFileStore } from '@auto-engineer/file-store';
import {
  parseImports,
  parseTypeDefinitions,
  parseIntegrationExports,
  parseIntegrationImports,
  parseGivenTypeArguments,
  parseWhenTypeArguments,
  patchImportMeta,
  transpileToCjs,
  TypeInfo,
} from './ts-utils';
import { toPosix } from './fs-path';
import { resolveSpecifier } from './resolver';
import { integrationExportRegistry } from '../integration-export-registry';
import { createVfsCompilerHost } from './vfs-compiler-host';

const debug = createDebug('flow:graph');

async function collectAllTypings(
  vfs: IFileStore,
  externalPkgs: Set<string>,
  rootDir: string,
): Promise<Map<string, Set<string>>> {
  const debug = createDebug('flow:graph');
  const pkgTypings = new Map<string, Set<string>>();
  const normRoot = toPosix(rootDir).replace(/\/+$/, '');

  function toTypesAlias(pkg: string): string {
    if (pkg.startsWith('@')) {
      const [scope, name] = pkg.split('/');
      return `@types/${scope.slice(1)}__${name}`;
    }
    return `@types/${pkg}`;
  }

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
    roots.add(`${root}/server/node_modules`);

    const out = [...roots].map(toPosix);
    debug('[typings] nm roots (no crawl): %o', out.slice(0, 5));
    return [...new Set(out)];
  }

  async function collectEntryDecl(nmRoot: string, pkg: string, out: Set<string>) {
    const pkgDir = `${nmRoot}/${pkg}`;

    const pkgJson = await readJsonIfExists(`${pkgDir}/package.json`);
    if (pkgJson && (typeof pkgJson.types === 'string' || typeof pkgJson.typings === 'string')) {
      const decl = toPosix(`${pkgDir}/${String(pkgJson.types ?? pkgJson.typings)}`.replace(/\/+/g, '/'));
      out.add(decl);
      debug('[typings] %s: package.json -> %s', pkg, decl);
      return;
    }

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

  debug('[typings] packages to probe: %o', [...externalPkgs]);
  for (const pkg of externalPkgs) {
    await collectTypingsForPackage(pkg);
  }

  return pkgTypings;
}

export type BuildGraphResult = {
  graph: Graph;
  vfsFiles: string[];
  externals: string[]; // raw specifiers (e.g. "zod", "graphql-tag")
  importMap: Record<string, unknown>;
  typings: Record<string, string[]>; // absolute POSIX paths of .d.ts
  typeMap: Map<string, string>; // mapping from TypeScript type names to string literals
  typesByFile: Map<string, Map<string, TypeInfo>>; // mapping from file path to type definitions in that file
  givenTypesByFile: Map<string, import('./ts-utils').GivenTypeInfo[]>; // mapping from file path to given type info
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
  const globalTypeMap = new Map<string, string>();
  const typesByFile = new Map<string, Map<string, TypeInfo>>();
  const givenTypesByFile = new Map<string, import('./ts-utils').GivenTypeInfo[]>();

  const compilerOptions: import('typescript').CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    lib: ['es2020'],
    allowJs: true,
    checkJs: false,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    jsx: ts.JsxEmit.React,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    strict: true,
    baseUrl: '.',
    rootDir: rootDir,
    // outDir: 'dist', // not used with transpileModule
    // Performance optimizations
    skipDefaultLibCheck: true,
    isolatedModules: true, // Faster compilation
    declaration: false,
    sourceMap: false,
    removeComments: true,
  };
  const sourceFiles = new Map<string, import('typescript').SourceFile>();
  const host = createVfsCompilerHost(ts, sourceFiles);

  function basePackageOf(spec: string): string {
    if (spec.startsWith('@')) {
      const parts = spec.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
    }
    const i = spec.indexOf('/');
    return i === -1 ? spec : spec.slice(0, i);
  }

  function detectScriptKind(path: string): import('typescript').ScriptKind {
    if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
    if (path.endsWith('.jsx')) return ts.ScriptKind.JSX;
    if (path.endsWith('.js') || path.endsWith('.mjs')) return ts.ScriptKind.JS;
    return ts.ScriptKind.TS;
  }

  function processTypesAndIntegrations(
    path: string,
    typeMap: Map<string, TypeInfo>,
    integrationExports: import('./ts-utils').IntegrationExport[],
  ): void {
    typesByFile.set(path, typeMap);
    for (const [typeName, typeInfo] of typeMap) {
      globalTypeMap.set(typeName, typeInfo.stringLiteral);
    }

    if (integrationExports.length > 0) {
      integrationExportRegistry.registerIntegrationExports(integrationExports);
      debug('[integrations] registered %d integration exports from %s', integrationExports.length, path);
    }
  }

  async function processImports(imports: string[], path: string): Promise<Map<string, import('./types').Resolved>> {
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

    return resolved;
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

    const scriptKind = detectScriptKind(path);
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.ES2020, true, scriptKind);
    sourceFiles.set(path, sourceFile);

    const imports = parseImports(ts, path, source);
    const typeMap = parseTypeDefinitions(ts, path, source);
    const integrationExports = parseIntegrationExports(ts, path, source);
    const integrationImports = parseIntegrationImports(ts, path, source);
    for (const [integrationName, importPath] of integrationImports) {
      const { addIntegrationImportPath } = await import('../transformers/flow-to-model/integrations');
      addIntegrationImportPath(integrationName, importPath);
    }
    const correlatedIntegrationExports = integrationExports.map((export_) => {
      const sourcePath = integrationImports.get(export_.exportName);
      return { ...export_, sourcePath };
    });

    processTypesAndIntegrations(path, typeMap, correlatedIntegrationExports);
    const resolved = await processImports(imports, path);

    const js = transpileToCjs(ts, path, source);
    graph.set(path, { js, imports, resolved });
    vfsFiles.add(path);
  }
  async function loadTypingFiles(pkgTypings: Map<string, Set<string>>): Promise<void> {
    const allTypingFiles: string[] = [];
    for (const typingPaths of pkgTypings.values()) {
      allTypingFiles.push(...typingPaths);
    }

    for (const typingFile of allTypingFiles) {
      const buf = await vfs.read(typingFile);
      if (buf) {
        const source = new TextDecoder().decode(buf);
        const sourceFile = ts.createSourceFile(typingFile, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
        sourceFiles.set(typingFile, sourceFile);
      }
    }
  }

  function extractTypeInfoFromProgram(
    program: import('typescript').Program,
    checker: import('typescript').TypeChecker,
  ): Map<string, import('./ts-utils').GivenTypeInfo[]> {
    const whenTypesByFile: Map<string, import('./ts-utils').GivenTypeInfo[]> = new Map();

    for (const sourceFile of program.getSourceFiles()) {
      const posixPath = toPosix(sourceFile.fileName);
      if (!sourceFiles.has(posixPath) || posixPath.endsWith('.d.ts')) continue;

      const fileTypeMap = typesByFile.get(posixPath) || new Map();
      const extractedGivenTypes = parseGivenTypeArguments(ts, checker, sourceFile, fileTypeMap, typesByFile);
      const extractedWhenTypes = parseWhenTypeArguments(ts, checker, sourceFile, fileTypeMap, typesByFile);

      if (extractedGivenTypes.length > 0) {
        givenTypesByFile.set(posixPath, extractedGivenTypes);
        debug('[given-types] extracted %d .given<T>() calls from %s', extractedGivenTypes.length, posixPath);
      }

      if (extractedWhenTypes.length > 0) {
        whenTypesByFile.set(posixPath, extractedWhenTypes);
        debug(
          '[when-types] extracted %d .when<T>() calls from %s: %o',
          extractedWhenTypes.length,
          posixPath,
          extractedWhenTypes.map((t) => ({ typeName: t.typeName, classification: t.classification })),
        );
      }
    }

    return whenTypesByFile;
  }

  for (const entry of entryFiles) {
    await buildRec(toPosix(entry));
  }

  const pkgTypings = await collectAllTypings(vfs, externalPkgs, rootDir);
  await loadTypingFiles(pkgTypings);

  const program = ts.createProgram([...sourceFiles.keys()], compilerOptions, host);
  const checker = program.getTypeChecker();

  const whenTypesByFile = extractTypeInfoFromProgram(program, checker);

  givenTypesByFile.set('__whenTypes', whenTypesByFile as unknown as import('./ts-utils').GivenTypeInfo[]);

  const result: BuildGraphResult = {
    graph,
    vfsFiles: [...vfsFiles].sort(),
    externals: [...externals].sort(),
    importMap: { ...importMap },
    typings: Object.fromEntries([...pkgTypings.entries()].map(([k, v]) => [k, [...v].sort()])),
    typeMap: globalTypeMap,
    typesByFile,
    givenTypesByFile,
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
