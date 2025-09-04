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
  dataFields?: { name: string; type: string; required: boolean }[];
}

function extractDataFieldsFromTypeLiteral(
  ts: typeof import('typescript'),
  secondArg: import('typescript').TypeLiteralNode,
): { name: string; type: string; required: boolean }[] | undefined {
  const fields: { name: string; type: string; required: boolean }[] = [];
  for (const m of secondArg.members) {
    if (ts.isPropertySignature(m) && m.name !== undefined && ts.isIdentifier(m.name)) {
      const fieldName = m.name.text;
      const isOptional = m.questionToken !== undefined;
      const fieldType = extractTypeFromNode(ts, m.type);
      fields.push({
        name: fieldName,
        type: fieldType,
        required: !isOptional,
      });
    }
  }
  return fields.length > 0 ? fields : undefined;
}

function processTypeAlias(
  ts: typeof import('typescript'),
  node: import('typescript').TypeAliasDeclaration,
  typeMap: Map<string, TypeInfo>,
) {
  const typeName = node.name.text;

  if (!ts.isTypeReferenceNode(node.type)) return;

  const typeRef = node.type;

  const getBaseName = (tn: import('typescript').EntityName): string | undefined => {
    if (ts.isIdentifier(tn)) return tn.text;
    if (ts.isQualifiedName(tn)) return tn.right.text;
    return undefined;
  };

  const baseName = getBaseName(typeRef.typeName);
  if (typeof baseName !== 'string') return;

  if (!['Command', 'Event', 'State'].includes(baseName)) return;

  const typeArgs = typeRef.typeArguments ?? [];
  if (typeArgs.length === 0) return;

  const firstArg = typeArgs[0];
  if (!ts.isLiteralTypeNode(firstArg) || !ts.isStringLiteral(firstArg.literal)) return;

  const stringLiteral = firstArg.literal.text;
  const classification = baseName.toLowerCase() as 'command' | 'event' | 'state';

  // Try to extract the data fields from the 2nd generic arg (if present)
  let dataFields: { name: string; type: string; required: boolean }[] | undefined;
  if (typeArgs.length >= 2) {
    const secondArg = typeArgs[1];

    // Inline type literal: Command<'X', { a: string; b: number }>
    if (ts.isTypeLiteralNode(secondArg)) {
      dataFields = extractDataFieldsFromTypeLiteral(ts, secondArg);
    }
    // If it's a reference to another interface/type, skip deep resolution here,
  }

  // For State types, add the 'type' field to dataFields if it's not already there
  // if (classification === 'state' && dataFields) {
  //   const hasTypeField = dataFields.some(field => field.name === 'type');
  //   if (!hasTypeField) {
  //     // Add the type field with the literal value
  //     dataFields.unshift({
  //       name: 'type',
  //       type: `"${stringLiteral}"`, // Use the literal type
  //       required: true,
  //     });
  //   }
  // }

  typeMap.set(typeName, { stringLiteral, classification, dataFields });
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

// Helper to extract type reference
function extractTypeReference(
  ts: typeof import('typescript'),
  typeRef: import('typescript').TypeReferenceNode,
): string {
  if (ts.isIdentifier(typeRef.typeName)) {
    const typeName = typeRef.typeName.text;
    if (typeName === 'Date') return 'Date';
    return typeName;
  }
  return 'unknown';
}

// Helper to extract properties from a type literal
function extractTypeLiteralProperties(
  ts: typeof import('typescript'),
  typeLiteral: import('typescript').TypeLiteralNode,
): string {
  const properties: string[] = [];

  for (const member of typeLiteral.members) {
    if (ts.isPropertySignature(member) && member.name !== undefined && ts.isIdentifier(member.name)) {
      const propName = member.name.text;
      const propType = extractTypeFromNode(ts, member.type);
      const optional = member.questionToken !== undefined ? '?' : '';
      properties.push(`${propName}${optional}: ${propType}`);
    }
  }

  return `{ ${properties.join('; ')} }`;
}

// Helper to extract TypeScript type from a type node
// eslint-disable-next-line complexity
function extractTypeFromNode(ts: typeof import('typescript'), typeNode?: import('typescript').TypeNode): string {
  if (!typeNode) return 'unknown';

  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword: {
      return 'string';
    }
    case ts.SyntaxKind.NumberKeyword: {
      return 'number';
    }
    case ts.SyntaxKind.BooleanKeyword: {
      return 'boolean';
    }
    case ts.SyntaxKind.TypeReference: {
      return extractTypeReference(ts, typeNode as import('typescript').TypeReferenceNode);
    }
    case ts.SyntaxKind.ArrayType: {
      const arrayType = typeNode as import('typescript').ArrayTypeNode;
      const elementType = extractTypeFromNode(ts, arrayType.elementType);
      return `Array<${elementType}>`;
    }
    case ts.SyntaxKind.UnionType: {
      const unionType = typeNode as import('typescript').UnionTypeNode;
      const types = unionType.types.map((t) => extractTypeFromNode(ts, t));
      return types.join(' | ');
    }
    case ts.SyntaxKind.TypeLiteral: {
      return extractTypeLiteralProperties(ts, typeNode as import('typescript').TypeLiteralNode);
    }
    case ts.SyntaxKind.LiteralType: {
      const lt = typeNode as import('typescript').LiteralTypeNode;
      if (ts.isStringLiteral(lt.literal)) return `"${lt.literal.text}"`;
      if (ts.isNumericLiteral(lt.literal)) return lt.literal.text;
      if (lt.literal.kind === ts.SyntaxKind.TrueKeyword) return 'true';
      if (lt.literal.kind === ts.SyntaxKind.FalseKeyword) return 'false';
      return 'unknown';
    }
    default: {
      return 'unknown';
    }
  }
}

// Helper to extract data fields from interface
function extractDataFields(
  ts: typeof import('typescript'),
  member: import('typescript').PropertySignature,
): {
  name: string;
  type: string;
  required: boolean;
}[] {
  const dataFields: { name: string; type: string; required: boolean }[] = [];
  if (!member.type || !ts.isTypeLiteralNode(member.type)) return dataFields;

  for (const dataMember of member.type.members) {
    if (ts.isPropertySignature(dataMember) && dataMember.name !== undefined && ts.isIdentifier(dataMember.name)) {
      const fieldName = dataMember.name.text;
      const isOptional = dataMember.questionToken !== undefined;
      const fieldType = extractTypeFromNode(ts, dataMember.type);
      dataFields.push({
        name: fieldName,
        type: fieldType,
        required: !isOptional,
      });
    }
  }
  return dataFields;
}

// Helper to infer message classification from string literal naming patterns
function inferClassificationFromName(stringLiteral: string): 'command' | 'event' | 'state' | undefined {
  // Check for common event patterns (past tense)
  const eventPatterns = ['ed', 'Created', 'Updated', 'Deleted', 'Placed', 'Added', 'Removed', 'Changed'];
  if (eventPatterns.some((pattern) => stringLiteral.endsWith(pattern))) {
    return 'event';
  }

  // Check for command patterns (imperative)
  const commandPatterns = ['Create', 'Update', 'Delete', 'Place', 'Add', 'Remove', 'Enter', 'Submit', 'Suggest'];
  if (commandPatterns.some((pattern) => stringLiteral.startsWith(pattern))) {
    return 'command';
  }

  // Check for state patterns (nouns)
  const statePatterns = ['Summary', 'View', 'Items', 'List', 'Data', 'Info'];
  if (statePatterns.some((pattern) => stringLiteral.endsWith(pattern))) {
    return 'state';
  }

  return undefined;
}

// Helper to process interface members and extract type/data information
function processInterfaceMembers(
  ts: typeof import('typescript'),
  members: readonly import('typescript').TypeElement[],
): { stringLiteral?: string; dataFields: { name: string; type: string; required: boolean }[] } {
  let stringLiteral: string | undefined;
  const dataFields: { name: string; type: string; required: boolean }[] = [];

  for (const member of members) {
    if (!ts.isPropertySignature(member)) continue;
    if (member.name === undefined || !ts.isIdentifier(member.name)) continue;

    const memberName = member.name.text;

    if (memberName === 'type') {
      stringLiteral = extractTypeString(ts, member);
    } else if (memberName === 'data') {
      dataFields.push(...extractDataFields(ts, member));
    }
  }

  return { stringLiteral, dataFields };
}

// Helper to process interface declarations
function processInterface(
  ts: typeof import('typescript'),
  node: import('typescript').InterfaceDeclaration,
  typeMap: Map<string, TypeInfo>,
) {
  const typeName = node.name.text;
  const { stringLiteral, dataFields } = processInterfaceMembers(ts, node.members);

  if (stringLiteral !== undefined) {
    const classification = inferClassificationFromName(stringLiteral);
    typeMap.set(typeName, {
      stringLiteral,
      classification,
      dataFields: dataFields.length > 0 ? dataFields : undefined,
    });
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
