import type { IFileStore } from '@auto-engineer/file-store';
import { CANDIDATE_EXTS, dirname, join, normalize } from './fs-path';

export async function fileExists(vfs: IFileStore, p: string): Promise<boolean> {
  const buf = await vfs.read(p);
  return !!buf;
}

export async function resolveRelative(vfs: IFileStore, spec: string, parent: string): Promise<string | null> {
  const baseDir = dirname(parent);
  const raw = normalize(join(baseDir, spec));

  if (await fileExists(vfs, raw)) return raw;
  for (const ext of CANDIDATE_EXTS) if (await fileExists(vfs, raw + ext)) return raw + ext;
  for (const ext of CANDIDATE_EXTS) {
    const idx = normalize(join(raw, 'index' + ext));
    if (await fileExists(vfs, idx)) return idx;
  }
  return null;
}

export async function resolveAbsolute(vfs: IFileStore, spec: string): Promise<string | null> {
  const raw = normalize(spec);

  if (await fileExists(vfs, raw)) return raw;
  for (const ext of CANDIDATE_EXTS) if (await fileExists(vfs, raw + ext)) return raw + ext;
  for (const ext of CANDIDATE_EXTS) {
    const idx = normalize(join(raw, 'index' + ext));
    if (await fileExists(vfs, idx)) return idx;
  }
  return null;
}

/** Shim import.meta in user code (we only provide a url). */
export function patchImportMeta(src: string, absPath: string): string {
  return src.replace(/\bimport\.meta\b/g, `({ url: ${JSON.stringify('file://' + absPath)} })`);
}

export function parseImports(ts: typeof import('typescript'), fileName: string, source: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
  const specs: string[] = [];

  const handleImportDeclaration = (node: import('typescript').ImportDeclaration) => {
    if (ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push(node.moduleSpecifier.text);
    }
  };

  const handleExportDeclaration = (node: import('typescript').ExportDeclaration) => {
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push(node.moduleSpecifier.text);
    }
  };

  const handleDynamicImport = (node: import('typescript').CallExpression) => {
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) {
      const a0 = node.arguments[0];
      if (ts.isStringLiteral(a0)) specs.push(a0.text);
    }
  };

  sf.forEachChild((node) => {
    if (ts.isImportDeclaration(node)) {
      handleImportDeclaration(node);
    } else if (ts.isExportDeclaration(node)) {
      handleExportDeclaration(node);
    } else if (ts.isCallExpression(node)) {
      handleDynamicImport(node);
    }
  });

  return specs;
}

export function transpileToCjs(ts: typeof import('typescript'), fileName: string, source: string): string {
  const out = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      allowJs: true,
      skipLibCheck: true,
      sourceMap: false,
    },
    fileName,
  });
  return out.outputText;
}
