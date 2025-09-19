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

export interface IntegrationExport {
  exportName: string; // The variable name used in export
  integrationName: string; // The internal integration name
  sourcePath?: string; // The import path where this integration was imported from
}

export interface GivenTypeInfo {
  fileName: string;
  line: number;
  column: number;
  ordinal: number; // Sequential position within the file
  typeName: string;
  classification: 'command' | 'event' | 'state';
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
  }

  typeMap.set(typeName, { stringLiteral, classification, dataFields });
}

function extractTypeString(
  ts: typeof import('typescript'),
  member: import('typescript').PropertySignature,
): string | undefined {
  if (!member.type) return undefined;
  if (!ts.isLiteralTypeNode(member.type)) return undefined;
  if (!ts.isStringLiteral(member.type.literal)) return undefined;
  return member.type.literal.text;
}

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

function inferClassificationFromName(stringLiteral: string): 'command' | 'event' | 'state' | undefined {
  const eventPatterns = ['ed', 'Created', 'Updated', 'Deleted', 'Placed', 'Added', 'Removed', 'Changed'];
  if (eventPatterns.some((pattern) => stringLiteral.endsWith(pattern))) {
    return 'event';
  }

  const commandPatterns = ['Create', 'Update', 'Delete', 'Place', 'Add', 'Remove', 'Enter', 'Submit', 'Suggest'];
  if (commandPatterns.some((pattern) => stringLiteral.startsWith(pattern))) {
    return 'command';
  }

  const statePatterns = ['Summary', 'View', 'Items', 'List', 'Data', 'Info'];
  if (statePatterns.some((pattern) => stringLiteral.endsWith(pattern))) {
    return 'state';
  }

  return undefined;
}

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

/**
 * Parses integration export declarations from TypeScript source code.
 * Looks for patterns like: export const ProductCatalog: Integration<'product-catalog', ...> = ...
 */
function processVariableDeclaration(
  ts: typeof import('typescript'),
  declaration: import('typescript').VariableDeclaration,
  integrations: IntegrationExport[],
): void {
  if (!ts.isIdentifier(declaration.name)) {
    return;
  }

  const exportName = declaration.name.text;

  // Check if the type annotation is Integration<...>
  if (!declaration.type || !ts.isTypeReferenceNode(declaration.type)) {
    return;
  }

  const typeRef = declaration.type;

  // Check if the type reference is "Integration"
  if (!ts.isIdentifier(typeRef.typeName) || typeRef.typeName.text !== 'Integration') {
    return;
  }

  // Extract the first type argument (the integration name string literal)
  const typeArgs = typeRef.typeArguments;
  if (!typeArgs || typeArgs.length === 0) {
    return;
  }

  const firstTypeArg = typeArgs[0];
  if (ts.isLiteralTypeNode(firstTypeArg) && ts.isStringLiteral(firstTypeArg.literal)) {
    const integrationName = firstTypeArg.literal.text;
    integrations.push({ exportName, integrationName });
  }
}

function processVariableStatement(
  ts: typeof import('typescript'),
  node: import('typescript').VariableStatement,
  integrations: IntegrationExport[],
): void {
  const hasExportModifier = Boolean(node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword));

  if (!hasExportModifier) {
    return;
  }

  for (const declaration of node.declarationList.declarations) {
    processVariableDeclaration(ts, declaration, integrations);
  }
}

export function parseIntegrationExports(
  ts: typeof import('typescript'),
  fileName: string,
  source: string,
): IntegrationExport[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
  const integrations: IntegrationExport[] = [];

  const visitNode = (node: import('typescript').Node) => {
    if (ts.isVariableStatement(node)) {
      processVariableStatement(ts, node, integrations);
    }
    ts.forEachChild(node, visitNode);
  };

  visitNode(sf);
  return integrations;
}

/**
 * Parse import statements and match integration imports to their source paths
 */
export function parseIntegrationImports(
  ts: typeof import('typescript'),
  fileName: string,
  source: string,
): Map<string, string> {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
  const integrationToImportPath = new Map<string, string>();

  const visitNode = (node: import('typescript').Node) => {
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier) && node.importClause?.namedBindings) {
        const importPath = node.moduleSpecifier.text;

        if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            const importedName = element.name.text;
            integrationToImportPath.set(importedName, importPath);
          }
        }
      }
    }
    ts.forEachChild(node, visitNode);
  };

  visitNode(sf);
  return integrationToImportPath;
}

function classifyBaseGeneric(
  ts: typeof import('typescript'),
  checker: import('typescript').TypeChecker,
  typeRef: import('typescript').TypeReferenceNode,
): 'event' | 'command' | 'state' | null {
  // Resolve base symbol (handles aliases and qualified names)
  let sym: import('typescript').Symbol | undefined;
  if (ts.isIdentifier(typeRef.typeName) || ts.isQualifiedName(typeRef.typeName)) {
    const baseType = checker.getTypeAtLocation(typeRef.typeName);
    sym = baseType.aliasSymbol ?? baseType.getSymbol();
    if (sym && baseType.aliasSymbol) sym = checker.getAliasedSymbol(sym);
  }
  if (!sym) return null;
  const base = checker.getFullyQualifiedName(sym).replace(/^".*"\./, '');
  if (base.endsWith('Event')) return 'event';
  if (base.endsWith('Command')) return 'command';
  if (base.endsWith('State')) return 'state';
  return null;
}

function tryUnwrapGeneric(
  ts: typeof import('typescript'),
  typeArg: import('typescript').TypeNode,
  checker: import('typescript').TypeChecker,
): { typeName: string; classification: 'event' | 'command' | 'state' } | null {
  if (!ts.isTypeReferenceNode(typeArg) || typeArg.typeArguments === undefined || typeArg.typeArguments.length === 0) {
    return null;
  }

  const kind = classifyBaseGeneric(ts, checker, typeArg);
  const first = typeArg.typeArguments[0];

  if (kind && ts.isLiteralTypeNode(first) && ts.isStringLiteral(first.literal)) {
    return {
      typeName: first.literal.text,
      classification: kind,
    };
  }

  return null;
}

function resolveTypeName(
  ts: typeof import('typescript'),
  typeArg: import('typescript').TypeNode,
  checker: import('typescript').TypeChecker,
): string | null {
  if (ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName)) {
    return typeArg.typeName.text;
  }

  const t = checker.getTypeFromTypeNode(typeArg);
  if (t === null || t === undefined) return null;

  const sym = t.aliasSymbol ?? t.getSymbol();
  if (!sym) return null;

  return checker.getFullyQualifiedName(sym).replace(/^".*"\./, '');
}

function findTypeInfo(
  typeName: string,
  typeMap: Map<string, TypeInfo>,
  typesByFile: Map<string, Map<string, TypeInfo>>,
): TypeInfo | null {
  let ti = typeMap.get(typeName);

  if (!ti?.classification) {
    for (const [, fileTypeMap] of typesByFile) {
      ti = fileTypeMap.get(typeName);
      if (ti?.classification) break;
    }
  }

  return ti && ti.classification ? ti : null;
}

function createGivenTypeInfo(
  sourceFile: import('typescript').SourceFile,
  node: import('typescript').CallExpression,
  ordinal: number,
  typeName: string,
  classification: 'event' | 'command' | 'state',
): GivenTypeInfo {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return {
    fileName: sourceFile.fileName,
    line: line + 1,
    column: character + 1,
    ordinal,
    typeName,
    classification,
  };
}

function processGivenOrAndCallExpression(
  ts: typeof import('typescript'),
  node: import('typescript').CallExpression,
  checker: import('typescript').TypeChecker,
  sourceFile: import('typescript').SourceFile,
  typeMap: Map<string, TypeInfo>,
  typesByFile: Map<string, Map<string, TypeInfo>>,
  givenTypes: GivenTypeInfo[],
  ordinal: number,
): void {
  const typeArg = node.typeArguments?.[0];
  if (!typeArg) return;

  const genericResult = tryUnwrapGeneric(ts, typeArg, checker);
  if (genericResult) {
    givenTypes.push(
      createGivenTypeInfo(sourceFile, node, ordinal, genericResult.typeName, genericResult.classification),
    );
    return;
  }

  const typeName = resolveTypeName(ts, typeArg, checker);
  if (typeName === null || typeName === undefined) return;

  const typeInfo = findTypeInfo(typeName, typeMap, typesByFile);
  if (!typeInfo?.classification) return;

  givenTypes.push(createGivenTypeInfo(sourceFile, node, ordinal, typeInfo.stringLiteral, typeInfo.classification));
}

function isChainStart(ts: typeof import('typescript'), node: import('typescript').CallExpression): boolean {
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  const method = node.expression.name.getText();
  if (method !== 'given' && method !== 'and') return false;
  const target = node.expression.expression;
  if (ts.isCallExpression(target) && ts.isPropertyAccessExpression(target.expression)) {
    const targetMethod = target.expression.name.getText();
    return targetMethod !== 'given' && targetMethod !== 'and';
  }
  return true;
}

function collectChainFromStart(
  ts: typeof import('typescript'),
  startNode: import('typescript').CallExpression,
): import('typescript').CallExpression[] {
  const chain: import('typescript').CallExpression[] = [];
  const collectNext = (node: import('typescript').Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.getText();
      if (method === 'given' || method === 'and') {
        chain.push(node);
      }
    }
    ts.forEachChild(node, collectNext);
  };
  const nodeToProcess = startNode.parent ?? startNode;
  collectNext(nodeToProcess);
  // Sort by source position to get correct execution order
  return chain.sort((a, b) => a.getStart() - b.getStart());
}

export function parseGivenTypeArguments(
  ts: typeof import('typescript'),
  checker: import('typescript').TypeChecker,
  sourceFile: import('typescript').SourceFile,
  typeMap: Map<string, TypeInfo>,
  typesByFile: Map<string, Map<string, TypeInfo>>,
): GivenTypeInfo[] {
  const givenTypes: GivenTypeInfo[] = [];
  const processedNodes = new Set<import('typescript').CallExpression>();

  // First pass: find all given/and chain starts
  const visit = (node: import('typescript').Node): void => {
    if (ts.isCallExpression(node) && !processedNodes.has(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        const method = node.expression.name.getText();
        if (method === 'given' && isChainStart(ts, node)) {
          // Found a chain start, collect the entire chain
          const chain = collectChainFromStart(ts, node);
          let ordinal = givenTypes.length;

          for (const chainNode of chain) {
            if (chainNode.typeArguments !== undefined && chainNode.typeArguments.length > 0) {
              processGivenOrAndCallExpression(
                ts,
                chainNode,
                checker,
                sourceFile,
                typeMap,
                typesByFile,
                givenTypes,
                ordinal++,
              );
              processedNodes.add(chainNode);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return givenTypes;
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
      // Performance optimizations
      removeComments: true,
      skipDefaultLibCheck: true,
      isolatedModules: true,
      declaration: false,
    },
    fileName,
    transformers: {
      before: [],
      after: [],
    },
  });
  return out.outputText;
}
