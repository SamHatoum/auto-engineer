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

export interface TypeInfo {
  stringLiteral: string;
  classification?: 'command' | 'event' | 'state';
  dataFields?: string[];
}

// Helper to process type alias declarations
function processTypeAlias(
  ts: typeof import('typescript'),
  node: import('typescript').TypeAliasDeclaration,
  typeMap: Map<string, TypeInfo>,
) {
  const typeName = node.name.text;

  if (!ts.isTypeReferenceNode(node.type)) return;

  const typeRef = node.type;
  if (!ts.isIdentifier(typeRef.typeName)) return;

  const referenceName = typeRef.typeName.text;
  if (!['Command', 'Event', 'State'].includes(referenceName)) return;
  if (!typeRef.typeArguments || typeRef.typeArguments.length === 0) return;

  const firstArg = typeRef.typeArguments[0];
  if (!ts.isLiteralTypeNode(firstArg) || !ts.isStringLiteral(firstArg.literal)) return;

  const stringLiteral = firstArg.literal.text;
  const classification = referenceName.toLowerCase() as 'command' | 'event' | 'state';
  typeMap.set(typeName, { stringLiteral, classification });
}

// Helper to extract string literal from type property
function extractTypeString(
  ts: typeof import('typescript'),
  member: import('typescript').PropertySignature,
): string | undefined {
  if (!member.type) return undefined;
  if (!ts.isLiteralTypeNode(member.type)) return undefined;
  if (!ts.isStringLiteral(member.type.literal)) return undefined;
  return member.type.literal.text;
}

// Helper to extract data fields from interface
function extractDataFields(ts: typeof import('typescript'), member: import('typescript').PropertySignature): string[] {
  const dataFields: string[] = [];
  if (!member.type || !ts.isTypeLiteralNode(member.type)) return dataFields;

  for (const dataMember of member.type.members) {
    if (ts.isPropertySignature(dataMember) && dataMember.name !== undefined && ts.isIdentifier(dataMember.name)) {
      dataFields.push(dataMember.name.text);
    }
  }
  return dataFields;
}

// Helper to process interface declarations
function processInterface(
  ts: typeof import('typescript'),
  node: import('typescript').InterfaceDeclaration,
  typeMap: Map<string, TypeInfo>,
) {
  const typeName = node.name.text;
  let stringLiteral: string | undefined;
  const dataFields: string[] = [];

  for (const member of node.members) {
    if (!ts.isPropertySignature(member)) continue;
    if (member.name === undefined || !ts.isIdentifier(member.name)) continue;

    const memberName = member.name.text;

    if (memberName === 'type') {
      stringLiteral = extractTypeString(ts, member);
    } else if (memberName === 'data') {
      dataFields.push(...extractDataFields(ts, member));
    }
  }

  if (stringLiteral !== undefined) {
    typeMap.set(typeName, { stringLiteral, dataFields });
  }
}

export function parseTypeDefinitions(
  ts: typeof import('typescript'),
  fileName: string,
  source: string,
): Map<string, TypeInfo> {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
  const typeMap = new Map<string, TypeInfo>();

  const visitNode = (node: import('typescript').Node) => {
    if (ts.isTypeAliasDeclaration(node)) {
      processTypeAlias(ts, node, typeMap);
    } else if (ts.isInterfaceDeclaration(node)) {
      processInterface(ts, node, typeMap);
    }

    ts.forEachChild(node, visitNode);
  };

  visitNode(sf);
  return typeMap;
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
