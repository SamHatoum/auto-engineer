import { type Command, defineCommandHandler, type Event } from '@auto-engineer/message-bus';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';
import createDebug from 'debug';
import { callAI, loadScheme } from '../agent';
import { execa } from 'execa';
import { performance } from 'perf_hooks';

const debug = createDebug('auto:client-implementer:component');
const debugTypeCheck = createDebug('auto:client-implementer:component:typecheck');
const debugProcess = createDebug('auto:client-implementer:component:process');
const debugResult = createDebug('auto:client-implementer:component:result');

interface ComponentRegistryEntry {
  name: string;
  actualFilename: string;
  type: 'atoms' | 'molecules' | 'organisms';
  exports: string[];
}

type ComponentRegistry = Map<string, ComponentRegistryEntry>;

export type ImplementComponentCommand = Command<
  'ImplementComponent',
  {
    projectDir: string;
    iaSchemeDir: string;
    designSystemPath: string;
    componentType: 'atom' | 'molecule' | 'organism' | 'page';
    filePath: string;
    componentName: string;
    failures?: string[];
    aiOptions?: {
      temperature?: number;
      maxTokens?: number;
    };
  }
>;

export type ComponentImplementedEvent = Event<
  'ComponentImplemented',
  {
    filePath: string;
    componentType: string;
    componentName: string;
    composition: string[];
    specs: string[];
  }
>;

export type ComponentImplementationFailedEvent = Event<
  'ComponentImplementationFailed',
  {
    error: string;
    componentType: string;
    componentName: string;
    filePath: string;
  }
>;

export const commandHandler = defineCommandHandler<
  ImplementComponentCommand,
  (command: ImplementComponentCommand) => Promise<ComponentImplementedEvent | ComponentImplementationFailedEvent>
>({
  name: 'ImplementComponent',
  alias: 'implement:component',
  description: 'AI implements a single component (atom, molecule, organism, or page)',
  category: 'implement',
  icon: 'layers',
  fields: {
    projectDir: { description: 'Project directory path', required: true },
    iaSchemeDir: { description: 'IA schema directory path', required: true },
    designSystemPath: { description: 'Design system file path', required: true },
    componentType: {
      description: 'Type of component: atom|molecule|organism|page',
      required: true,
    },
    filePath: { description: 'Component file path', required: true },
    componentName: { description: 'Name of component to implement', required: true },
    failures: { description: 'Any failures from previous implementations', required: false },
    aiOptions: {
      description: 'AI generation options',
      required: false,
    },
  },
  examples: [
    '$ auto implement:component --project-dir=./client --ia-scheme-dir=./.context --design-system-path=./design-system.md --component-type=molecule --component-name=SurveyCard',
  ],
  events: ['ComponentImplemented', 'ComponentImplementationFailed'],
  handle: async (
    command: ImplementComponentCommand,
  ): Promise<ComponentImplementedEvent | ComponentImplementationFailedEvent> => {
    const result = await handleImplementComponentCommandInternal(command);
    if (result.type === 'ComponentImplemented') {
      debug('Component implemented successfully: %s/%s', result.data.componentType, result.data.componentName);
    } else {
      debug('Component implementation failed: %s', result.data.error);
    }
    return result;
  },
});

interface ComponentLoadData {
  scheme: Record<string, unknown>;
  componentDef: Record<string, unknown>;
  existingScaffold: string;
  projectConfig: Record<string, string>;
  designSystemReference: string;
  registry: ComponentRegistry;
  outPath: string;
}

async function loadComponentDataForImplementation(
  iaSchemeDir: string,
  componentType: string,
  componentName: string,
  projectDir: string,
  designSystemPath: string,
  filePath: string,
): Promise<ComponentLoadData> {
  const t1 = performance.now();
  const scheme = await loadScheme(iaSchemeDir);
  debugProcess(`[1] Loaded IA scheme in ${(performance.now() - t1).toFixed(2)} ms`);
  if (!scheme) throw new Error('IA scheme not found');

  const pluralKey = `${componentType}s`;
  const collection = (scheme as Record<string, unknown>)[pluralKey];
  if (!isValidCollection(collection)) throw new Error(`Invalid IA schema structure for ${pluralKey}`);

  const items = (collection as { items: Record<string, unknown> }).items;
  const componentDef = items[componentName] as Record<string, unknown> | undefined;
  if (!componentDef) throw new Error(`Component ${componentType}:${componentName} not found in IA schema`);

  const outPath = path.join(projectDir, '..', filePath);

  const t2 = performance.now();
  let existingScaffold = '';
  try {
    existingScaffold = await fs.readFile(outPath, 'utf-8');
    debugProcess(`[2] Found existing scaffold in ${(performance.now() - t2).toFixed(2)} ms`);
  } catch {
    debugProcess(`[2] No existing scaffold found (${(performance.now() - t2).toFixed(2)} ms)`);
  }

  const t3 = performance.now();
  const projectConfig = await readProjectContext(projectDir);
  debugProcess(`[3] Loaded project context in ${(performance.now() - t3).toFixed(2)} ms`);

  const t4 = performance.now();
  const designSystemReference = await readDesignSystem(designSystemPath, { projectDir, iaSchemeDir });
  debugProcess(`[4] Loaded design system reference in ${(performance.now() - t4).toFixed(2)} ms`);

  const t5 = performance.now();
  const registry = await buildComponentRegistry(projectDir);
  debugProcess(`[5] Built component registry in ${(performance.now() - t5).toFixed(2)} ms`);

  return {
    scheme: scheme as Record<string, unknown>,
    componentDef,
    existingScaffold,
    projectConfig,
    designSystemReference,
    registry,
    outPath,
  };
}

async function loadDependencySources(
  scheme: Record<string, unknown>,
  componentType: string,
  componentName: string,
  projectDir: string,
  registry: ComponentRegistry,
): Promise<Record<string, string>> {
  const dependencyList = await resolveDependenciesRecursively(scheme, componentType, componentName);
  debugProcess(`[6] Resolved ${dependencyList.length} dependencies for ${componentName}`);

  const { primary: primaryDeps } = resolveDependenciesToRegistry(dependencyList, registry);
  const dependencySources: Record<string, string> = {};

  const allAtoms = Array.from(registry.entries())
    .filter(([_, entry]) => entry.type === 'atoms')
    .map(([name, _]) => name);

  for (const atomName of allAtoms) {
    const atomSource = await readComponentPropsInterface(projectDir, 'atoms', atomName, registry);
    if (atomSource !== null) {
      dependencySources[`atoms/${atomName}`] = atomSource;
    }
  }

  for (const dep of primaryDeps) {
    debugProcess(`[readComponentPropsInterface] Attempting to read props for ${dep.type}/${dep.name}`);
    const depPropsInterface = await readComponentPropsInterface(projectDir, dep.type, dep.name, registry);
    if (depPropsInterface != null) {
      debugProcess(`[readComponentPropsInterface] Successfully read props for ${dep.type}/${dep.name}`);
      dependencySources[`${dep.type}/${dep.name}`] = depPropsInterface;
    } else {
      debugProcess(`[readComponentPropsInterface] Failed to read props for ${dep.type}/${dep.name} (returned null)`);
    }
  }

  return dependencySources;
}

async function generateCodeWithRetryLoop(params: {
  componentName: string;
  componentDef: Record<string, unknown>;
  basePrompt: string;
  composition: string[];
  dependencySummary: string;
  projectConfig: Record<string, string>;
  graphqlFiles: Record<string, string>;
  outPath: string;
  projectDir: string;
  registry: ComponentRegistry;
  maxTokens: number;
  existingScaffold: string;
}): Promise<string> {
  const {
    componentName,
    componentDef,
    basePrompt,
    composition,
    dependencySummary,
    projectConfig,
    graphqlFiles,
    outPath,
    projectDir,
    registry,
    existingScaffold,
  } = params;

  let attempt = 1;
  let code = '';
  let lastErrors = '';
  let lastImportErrors: string[] = [];
  const maxAttempts = 3;
  let currentMaxTokens = params.maxTokens;
  const description = (componentDef.description as string) ?? '';

  await fs.mkdir(path.dirname(outPath), { recursive: true });

  while (attempt <= maxAttempts) {
    const genStart = performance.now();

    const prompt =
      attempt === 1
        ? makeImplementPrompt(basePrompt, graphqlFiles)
        : makeRetryPrompt(
            componentName,
            lastErrors,
            composition,
            dependencySummary,
            lastImportErrors,
            description,
            existingScaffold,
            projectConfig['package.json'] ?? '',
            graphqlFiles,
          );

    const promptPath = `/tmp/prompt-${componentName}-attempt-${attempt}.txt`;
    await fs.writeFile(promptPath, prompt, 'utf-8');
    debugProcess(`[DEBUG] Saved prompt to ${promptPath} (${prompt.length} chars)`);

    const aiRaw = await callAI(prompt, { maxTokens: currentMaxTokens });
    code = extractCodeBlock(aiRaw);

    const isTruncated = detectTruncation(code);
    if (isTruncated) {
      const suggestedMaxTokens = Math.ceil(currentMaxTokens * 1.5);
      debugProcess(
        `[WARNING] Truncation detected at attempt ${attempt}. Increasing maxTokens: ${currentMaxTokens} → ${suggestedMaxTokens}`,
      );
      currentMaxTokens = suggestedMaxTokens;
    }

    await fs.writeFile(outPath, code, 'utf-8');
    debugProcess(
      `[6.${attempt}] AI output written (${code.length} chars, truncated: ${isTruncated}) in ${(performance.now() - genStart).toFixed(2)} ms`,
    );

    const importValidation = validateImports(code, registry);
    lastImportErrors = importValidation.errors;
    if (!importValidation.valid) {
      debugProcess(`[WARN] Invalid imports detected: ${importValidation.errors.join('; ')}`);
    }

    const checkStart = performance.now();
    const { success, errors } = await runTypeCheckForFile(projectDir, outPath);
    debugTypeCheck(
      `[7.${attempt}] Type check in ${(performance.now() - checkStart).toFixed(2)} ms (success: ${success})`,
    );

    if (success) {
      return code;
    }

    lastErrors = errors;
    if (attempt === maxAttempts) {
      const wasTruncated = detectTruncation(code);
      const errorMessage = wasTruncated
        ? `Component generation failed after ${attempt} attempts due to output truncation.\n` +
          `Final maxTokens used: ${currentMaxTokens}\n` +
          `Suggestion: Increase aiOptions.maxTokens in your config (try ${Math.ceil(currentMaxTokens * 1.5)} or higher)\n\n` +
          `TypeScript errors:\n${errors}`
        : `Type errors persist after ${attempt} attempts:\n${errors}`;
      throw new Error(errorMessage);
    }
    attempt += 1;
  }

  throw new Error('Unreachable state');
}

async function handleImplementComponentCommandInternal(
  command: ImplementComponentCommand,
): Promise<ComponentImplementedEvent | ComponentImplementationFailedEvent> {
  const { projectDir, iaSchemeDir, designSystemPath, componentType, componentName, filePath } = command.data;

  try {
    const start = performance.now();
    debugProcess(`Starting ${componentType}:${componentName}`);

    const loadData = await loadComponentDataForImplementation(
      iaSchemeDir,
      componentType,
      componentName,
      projectDir,
      designSystemPath,
      filePath,
    );

    const dependencySources = await loadDependencySources(
      loadData.scheme,
      componentType,
      componentName,
      projectDir,
      loadData.registry,
    );

    const usageInfo = await extractComponentUsageFromScaffolds(
      componentName,
      componentType as 'molecule' | 'organism',
      projectDir,
    );
    debugProcess(
      `[extractComponentUsageFromScaffolds] Found ${usageInfo.usageExamples.length} usage examples, requiresChildren: ${usageInfo.requiresChildren}`,
    );

    const basePrompt = makeBasePrompt(
      componentType,
      componentName,
      loadData.componentDef,
      loadData.existingScaffold,
      loadData.projectConfig,
      loadData.designSystemReference,
      dependencySources,
      usageInfo,
    );

    const composition = extractComposition(loadData.componentDef);
    const dependencySummary =
      Object.entries(dependencySources)
        .map(([name, src]) => `### ${name}\n${src}`)
        .join('\n\n') || '(No dependencies found)';

    const hasOwnDataRequirements = hasDataRequirements(loadData.componentDef);
    const hasParentDataRequirements =
      componentType === 'molecule' ? findParentDataRequirements(loadData.scheme, componentName) : false;
    const needsGraphQLFiles = hasOwnDataRequirements || hasParentDataRequirements;

    let graphqlFiles: Record<string, string> = {};
    if (needsGraphQLFiles) {
      const t6 = performance.now();
      graphqlFiles = await readGraphQLFiles(projectDir);
      const reason = hasOwnDataRequirements ? 'has own data requirements' : 'parent has data requirements';
      debugProcess(
        `[6] Loaded GraphQL files for ${componentName} (${reason}) in ${(performance.now() - t6).toFixed(2)} ms`,
      );
    } else {
      debugProcess(`[6] Skipped GraphQL files for ${componentName} (no data requirements)`);
    }

    await generateCodeWithRetryLoop({
      componentName,
      componentDef: loadData.componentDef,
      basePrompt,
      composition,
      dependencySummary,
      projectConfig: loadData.projectConfig,
      graphqlFiles,
      outPath: loadData.outPath,
      projectDir,
      registry: loadData.registry,
      maxTokens: command.data.aiOptions?.maxTokens ?? 2000,
      existingScaffold: loadData.existingScaffold,
    });

    debugResult(`[✓] Implementation succeeded in ${(performance.now() - start).toFixed(2)} ms total`);
    return {
      type: 'ComponentImplemented',
      data: {
        filePath: loadData.outPath,
        componentType,
        componentName,
        composition: extractComposition(loadData.componentDef),
        specs: extractSpecs(loadData.componentDef),
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error: unknown) {
    debug('[Error] Component implementation failed: %O', error);
    return {
      type: 'ComponentImplementationFailed',
      data: {
        error: error instanceof Error ? error.message : String(error),
        componentType,
        componentName,
        filePath,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

async function resolveCompositionDependencies(
  scheme: Record<string, unknown>,
  composition: Record<string, string[]>,
  visited: Set<string>,
): Promise<{ type: string; name: string }[]> {
  const result: { type: string; name: string }[] = [];
  for (const [subType, subNames] of Object.entries(composition)) {
    if (!Array.isArray(subNames)) continue;
    for (const subName of subNames) {
      result.push({ type: subType, name: subName });
      const nested = await resolveDependenciesRecursively(scheme, subType, subName, visited);
      result.push(...nested);
    }
  }
  return result;
}

async function resolveLayoutDependencies(
  scheme: Record<string, unknown>,
  layout: Record<string, unknown>,
  visited: Set<string>,
): Promise<{ type: string; name: string }[]> {
  const result: { type: string; name: string }[] = [];
  if ('organisms' in layout && Array.isArray(layout.organisms)) {
    for (const organismName of layout.organisms as string[]) {
      result.push({ type: 'organisms', name: organismName });
      const nested = await resolveDependenciesRecursively(scheme, 'organisms', organismName, visited);
      result.push(...nested);
    }
  }
  return result;
}

function getComponentDefinitionFromScheme(
  scheme: Record<string, unknown>,
  type: string,
  name: string,
): Record<string, unknown> | null {
  const collection = scheme[`${type}s`];
  if (collection === null || collection === undefined || !isValidCollection(collection)) return null;

  const def = collection.items[name];
  if (def === null || def === undefined || typeof def !== 'object') return null;

  return def as Record<string, unknown>;
}

async function resolveDependenciesRecursively(
  scheme: Record<string, unknown>,
  type: string,
  name: string,
  visited: Set<string> = new Set(),
): Promise<{ type: string; name: string }[]> {
  const key = `${type}:${name}`;
  if (visited.has(key)) return [];
  visited.add(key);

  const def = getComponentDefinitionFromScheme(scheme, type, name);
  if (def === null) return [];

  const result: { type: string; name: string }[] = [];

  if ('composition' in def) {
    const compositionDeps = await resolveCompositionDependencies(
      scheme,
      def.composition as Record<string, string[]>,
      visited,
    );
    result.push(...compositionDeps);
  }

  if ('layout' in def && typeof def.layout === 'object' && def.layout !== null) {
    const layoutDeps = await resolveLayoutDependencies(scheme, def.layout as Record<string, unknown>, visited);
    result.push(...layoutDeps);
  }

  return result;
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = 'modifiers' in node ? (node.modifiers as readonly ts.Modifier[] | undefined) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function extractFromVariableStatement(node: ts.VariableStatement, exports: string[]): void {
  node.declarationList.declarations.forEach((decl) => {
    if (ts.isIdentifier(decl.name)) {
      exports.push(decl.name.text);
    }
  });
}

function extractFromExportDeclaration(node: ts.ExportDeclaration, exports: string[]): void {
  if (node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
    node.exportClause.elements.forEach((element) => {
      exports.push(element.name.text);
    });
  }
}

function extractExportedComponentNames(sourceFile: ts.SourceFile): string[] {
  const exports: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      extractFromVariableStatement(node, exports);
    } else if (ts.isExportDeclaration(node)) {
      extractFromExportDeclaration(node, exports);
    } else if (ts.isFunctionDeclaration(node) && hasExportModifier(node) && node.name !== undefined) {
      exports.push(node.name.text);
    }
  });

  return exports;
}

function extractAllExportedTypes(sourceFile: ts.SourceFile): string[] {
  const types: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      if (hasExport) {
        types.push(node.name.text);
      }
    }
    if (ts.isTypeAliasDeclaration(node)) {
      const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      if (hasExport) {
        types.push(node.name.text);
      }
    }
  });

  return types;
}

function extractTypeReferencesFromProps(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
): Set<string> {
  const refs = new Set<string>();

  function visitType(typeNode: ts.TypeNode): void {
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText(sourceFile);
      refs.add(typeName);
    }
    if (ts.isArrayTypeNode(typeNode)) {
      visitType(typeNode.elementType);
    }
    if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
      typeNode.types.forEach(visitType);
    }
    if (ts.isFunctionTypeNode(typeNode)) {
      typeNode.parameters.forEach((param) => {
        if (param.type !== undefined) visitType(param.type);
      });
      if (typeNode.type !== undefined) visitType(typeNode.type);
    }
    if (ts.isParenthesizedTypeNode(typeNode)) {
      visitType(typeNode.type);
    }
  }

  if (ts.isInterfaceDeclaration(node)) {
    node.members.forEach((member) => {
      if (ts.isPropertySignature(member) && member.type !== undefined) {
        visitType(member.type);
      }
    });
  } else if (ts.isTypeAliasDeclaration(node) && node.type !== undefined) {
    visitType(node.type);
  }

  return refs;
}

function extractTypeAlias(node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile): string {
  const typeName = node.name.text;
  const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  const exportPrefix = hasExport ? 'export ' : '';
  const typeValue = node.type?.getText(sourceFile) ?? 'unknown';
  return `${exportPrefix}type ${typeName} = ${typeValue}`;
}

function extractEnumDefinition(node: ts.EnumDeclaration, sourceFile: ts.SourceFile): string {
  const enumName = node.name.text;
  const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  const exportPrefix = hasExport ? 'export ' : '';
  const members = node.members
    .map((m) => {
      const name = m.name.getText(sourceFile);
      const value = m.initializer?.getText(sourceFile);
      return value !== undefined ? `${name} = ${value}` : name;
    })
    .join(', ');
  return `${exportPrefix}enum ${enumName} { ${members} }`;
}

function extractInterfaceDefinition(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): string {
  const interfaceName = node.name.text;
  const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  const exportPrefix = hasExport ? 'export ' : '';
  const members = node.members
    .map((member) => {
      if (ts.isPropertySignature(member) && member.name !== undefined) {
        const propName = member.name.getText(sourceFile);
        const optional = member.questionToken !== undefined ? '?' : '';
        const propType = member.type !== undefined ? member.type.getText(sourceFile) : 'any';
        return `${propName}${optional}: ${propType}`;
      }
      return '';
    })
    .filter((m) => m !== '')
    .join('; ');
  return `${exportPrefix}interface ${interfaceName} { ${members} }`;
}

function extractReferencedTypeDefinitions(sourceFile: ts.SourceFile, typeReferences: Set<string>): string {
  const definitions: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isTypeAliasDeclaration(node) && typeReferences.has(node.name.text)) {
      definitions.push(extractTypeAlias(node, sourceFile));
    } else if (ts.isEnumDeclaration(node) && typeReferences.has(node.name.text)) {
      definitions.push(extractEnumDefinition(node, sourceFile));
    } else if (
      ts.isInterfaceDeclaration(node) &&
      typeReferences.has(node.name.text) &&
      !node.name.text.includes('Props')
    ) {
      definitions.push(extractInterfaceDefinition(node, sourceFile));
    }
  });

  return definitions.length > 0 ? definitions.join('\n  ') : '';
}

function flattenPropsInterface(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
): string {
  const properties: string[] = [];

  if (ts.isInterfaceDeclaration(node)) {
    node.members.forEach((member) => {
      if (ts.isPropertySignature(member) && member.name !== undefined) {
        const propName = member.name.getText(sourceFile);
        const optional = member.questionToken ? '?' : '';
        const propType = member.type !== undefined ? member.type.getText(sourceFile) : 'any';
        properties.push(`${propName}${optional}: ${propType}`);
      }
    });
  } else if (ts.isTypeAliasDeclaration(node) && node.type !== undefined) {
    return node.type.getText(sourceFile);
  }

  return properties.join('; ');
}

function extractPropsAndImport(
  sourceCode: string,
  componentName: string,
  type: string,
  actualFilename: string,
): string {
  const sourceFile = ts.createSourceFile(`${componentName}.tsx`, sourceCode, ts.ScriptTarget.Latest, true);

  const exportedComponents = extractExportedComponentNames(sourceFile);
  const allExportedTypes = extractAllExportedTypes(sourceFile);

  let propsInline = '';
  let propsNode: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | null = null;

  ts.forEachChild(sourceFile, (node) => {
    if (!propsInline) {
      if (ts.isInterfaceDeclaration(node) && node.name.text.includes(`${componentName}Props`)) {
        propsInline = flattenPropsInterface(node, sourceFile);
        propsNode = node;
      } else if (ts.isTypeAliasDeclaration(node) && node.name.text.includes(`${componentName}Props`)) {
        propsInline = flattenPropsInterface(node, sourceFile);
        propsNode = node;
      }
    }
  });

  const typeReferences = propsNode !== null ? extractTypeReferencesFromProps(propsNode, sourceFile) : new Set<string>();

  const toImport = exportedComponents.length > 0 ? [...exportedComponents] : [componentName];

  for (const typeRef of typeReferences) {
    if (allExportedTypes.includes(typeRef) && !toImport.includes(typeRef)) {
      toImport.push(typeRef);
    }
  }

  const typeDefinitions = extractReferencedTypeDefinitions(sourceFile, typeReferences);

  const importStatement = `import { ${toImport.join(', ')} } from '@/components/${type}/${actualFilename}';`;

  const importLine = `**Import**: \`${importStatement}\``;
  const typeDefsLine = typeDefinitions ? `**Type Definitions**:\n  ${typeDefinitions}` : '';
  const propsLine = propsInline ? `**Props**: \`${propsInline}\`` : '**Props**: None';

  const parts = [importLine, typeDefsLine, propsLine].filter((p) => p !== '');
  return parts.join('\n');
}

async function readComponentPropsInterface(
  projectDir: string,
  _type: string,
  name: string,
  registry: ComponentRegistry,
): Promise<string | null> {
  const entry = registry.get(name);
  if (entry === undefined) {
    debugProcess(`[readComponentPropsInterface] No registry entry found for ${name}`);
    return null;
  }

  const file = path.join(projectDir, 'src', 'components', entry.type, `${entry.actualFilename}.tsx`);
  debugProcess(`[readComponentPropsInterface] Reading file: ${file}`);
  try {
    const sourceCode = await fs.readFile(file, 'utf-8');
    const result = extractPropsAndImport(sourceCode, name, entry.type, entry.actualFilename);
    debugProcess(`[readComponentPropsInterface] extractPropsAndImport returned ${result ? result.length : 0} chars`);
    return result;
  } catch (error) {
    debugProcess(`[readComponentPropsInterface] Error reading file: ${String(error)}`);
    return null;
  }
}

function extractCodeBlock(text: string): string {
  return text
    .replace(/```(?:tsx|ts|typescript)?/g, '')
    .replace(/```/g, '')
    .trim();
}

function detectTruncation(code: string): boolean {
  const truncationIndicators = [/<\w+[^/>]*$/, /<\/\w*$/, /"[^"]*$/, /'[^']*$/, /`[^`]*$/, /\{[^}]*$/m, /\([^)]*$/m];

  const lastLines = code.split('\n').slice(-5).join('\n');

  return truncationIndicators.some((pattern) => pattern.test(lastLines));
}

async function readEssentialFiles(projectDir: string): Promise<Record<string, string>> {
  debugProcess('[readEssentialFiles] Reading essential config files from %s', projectDir);
  const start = performance.now();
  const config: Record<string, string> = {};

  const essentialFiles = ['package.json', 'tsconfig.json', 'tailwind.config.js', 'tailwind.config.ts'];

  for (const file of essentialFiles) {
    try {
      config[file] = await fs.readFile(path.join(projectDir, file), 'utf-8');
      debugProcess(`Read essential file: ${file}`);
    } catch {
      debugProcess(`Essential file not found: ${file}`);
    }
  }

  debugProcess(`[readEssentialFiles] Completed in ${(performance.now() - start).toFixed(2)} ms`);
  return config;
}

function hasDataRequirements(componentDef: Record<string, unknown>): boolean {
  return (
    'data_requirements' in componentDef &&
    Array.isArray(componentDef.data_requirements) &&
    componentDef.data_requirements.length > 0
  );
}

function checkOrganismForMolecule(moleculeName: string, organismName: string, organismDef: unknown): boolean {
  if (typeof organismDef !== 'object' || organismDef === null) return false;

  const composition = (organismDef as Record<string, unknown>).composition as { molecules?: string[] } | undefined;

  const includesMolecule = composition?.molecules?.includes(moleculeName) ?? false;
  if (!includesMolecule) return false;

  const hasData = hasDataRequirements(organismDef as Record<string, unknown>);
  if (hasData) {
    debugProcess(
      `[findParentDataRequirements] Molecule ${moleculeName} is used by organism ${organismName} which has data_requirements`,
    );
    return true;
  }

  return false;
}

function checkPageLayoutOrganisms(
  layout: { organisms?: string[] } | undefined,
  organisms: { items: Record<string, unknown> },
  moleculeName: string,
): boolean {
  if (layout?.organisms === undefined) return false;

  for (const organismName of layout.organisms) {
    const organismDef = organisms.items[organismName];
    if (checkOrganismForMolecule(moleculeName, organismName, organismDef)) {
      return true;
    }
  }

  return false;
}

function checkPagesForMolecule(
  pages: { items?: Record<string, unknown> } | undefined,
  organisms: { items?: Record<string, unknown> } | undefined,
  moleculeName: string,
): boolean {
  if (pages?.items === undefined || organisms?.items === undefined) return false;

  const organismsWithItems = { items: organisms.items };

  for (const [, pageDef] of Object.entries(pages.items)) {
    if (typeof pageDef !== 'object' || pageDef === null) continue;

    const layout = (pageDef as Record<string, unknown>).layout as { organisms?: string[] } | undefined;
    if (checkPageLayoutOrganisms(layout, organismsWithItems, moleculeName)) {
      return true;
    }
  }

  return false;
}

function findParentDataRequirements(scheme: Record<string, unknown>, moleculeName: string): boolean {
  debugProcess(`[findParentDataRequirements] Checking if molecule ${moleculeName} has parents with data requirements`);

  const organisms = scheme.organisms as { items?: Record<string, unknown> } | undefined;

  if (organisms?.items !== undefined) {
    for (const [organismName, organismDef] of Object.entries(organisms.items)) {
      if (checkOrganismForMolecule(moleculeName, organismName, organismDef)) {
        return true;
      }
    }
  }

  const pages = scheme.pages as { items?: Record<string, unknown> } | undefined;
  if (checkPagesForMolecule(pages, organisms, moleculeName)) {
    return true;
  }

  debugProcess(`[findParentDataRequirements] No parents with data_requirements found for molecule ${moleculeName}`);
  return false;
}

async function readGraphQLFiles(projectDir: string): Promise<Record<string, string>> {
  debugProcess('[readGraphQLFiles] Reading GraphQL type definition files from %s', projectDir);
  const start = performance.now();
  const graphqlFiles: Record<string, string> = {};

  const graphqlFilePaths = ['src/gql/graphql.ts', 'src/graphql/queries.ts', 'src/graphql/mutations.ts'];

  for (const filePath of graphqlFilePaths) {
    try {
      graphqlFiles[filePath] = await fs.readFile(path.join(projectDir, filePath), 'utf-8');
      debugProcess(`Read GraphQL file: ${filePath}`);
    } catch {
      debugProcess(`GraphQL file not found: ${filePath}`);
    }
  }

  debugProcess(`[readGraphQLFiles] Completed in ${(performance.now() - start).toFixed(2)} ms`);
  return graphqlFiles;
}

async function readProjectContext(projectDir: string): Promise<Record<string, string>> {
  return await readEssentialFiles(projectDir);
}

async function executeTypeCheck(tsconfigRoot: string, strict: boolean): Promise<string> {
  const args = strict
    ? ['tsc', '--noEmit', '--skipLibCheck', '--strict', '--pretty', 'false']
    : ['tsc', '--noEmit', '--skipLibCheck', '--pretty', 'false'];

  const result = await execa('npx', args, {
    cwd: tsconfigRoot,
    stdio: 'pipe',
    reject: false,
  });

  return (result.stdout ?? '') + (result.stderr ?? '');
}

async function runGraphQLStrictCheck(
  tsconfigRoot: string,
  relativeFilePath: string,
  normalizedRelative: string,
  filePath: string,
): Promise<string> {
  debugTypeCheck(`[runTypeCheckForFile] Running strict GraphQL type check...`);
  const strictOutput = await executeTypeCheck(tsconfigRoot, true);
  const graphqlStrictErrors = filterErrorsForFile(strictOutput, relativeFilePath, normalizedRelative, filePath);
  debugTypeCheck(`[runTypeCheckForFile] GraphQL strict errors length: ${graphqlStrictErrors.length} chars`);
  return graphqlStrictErrors;
}

async function runTypeCheckForFile(
  projectDir: string,
  filePath: string,
): Promise<{ success: boolean; errors: string }> {
  const start = performance.now();
  try {
    const tsconfigRoot = await findProjectRoot(projectDir);
    const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(tsconfigRoot, filePath);
    const relativeFilePath = path.relative(tsconfigRoot, absoluteFilePath).replace(/\\/g, '/');
    const normalizedRelative = relativeFilePath.replace(/^client\//, '');

    debugTypeCheck(`[runTypeCheckForFile] tsconfigRoot: ${tsconfigRoot}`);
    debugTypeCheck(`[runTypeCheckForFile] absoluteFilePath: ${absoluteFilePath}`);
    debugTypeCheck(`[runTypeCheckForFile] relativeFilePath: ${relativeFilePath}`);
    debugTypeCheck(`[runTypeCheckForFile] normalizedRelative: ${normalizedRelative}`);

    const isGraphQLFile = await detectGraphQLFile(absoluteFilePath, relativeFilePath);
    debugTypeCheck(`[runTypeCheckForFile] isGraphQLFile: ${isGraphQLFile}`);

    const output = await executeTypeCheck(tsconfigRoot, false);
    debugTypeCheck(`[runTypeCheckForFile] Finished tsc in ${(performance.now() - start).toFixed(2)} ms`);
    debugTypeCheck(`[runTypeCheckForFile] Total output length: ${output.length} chars`);
    debugTypeCheck(`[runTypeCheckForFile] Output preview (first 2000 chars):\n${output.substring(0, 2000)}`);

    const filteredErrors = filterErrorsForFile(output, relativeFilePath, normalizedRelative, filePath);

    const graphqlStrictErrors = isGraphQLFile
      ? await runGraphQLStrictCheck(tsconfigRoot, relativeFilePath, normalizedRelative, filePath)
      : '';

    const formattedErrors = formatTypeCheckErrors(filteredErrors, graphqlStrictErrors);

    if (!output.includes('error TS') && formattedErrors.trim().length === 0) {
      debugTypeCheck(`[runTypeCheckForFile] No errors found`);
      return { success: true, errors: '' };
    }

    if (formattedErrors.trim().length === 0) return { success: true, errors: '' };
    return { success: false, errors: formattedErrors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: message };
  }
}

async function detectGraphQLFile(absoluteFilePath: string, relativeFilePath: string): Promise<boolean> {
  const isInGraphQLDir =
    relativeFilePath.includes('/graphql/') ||
    relativeFilePath.includes('/gql/') ||
    relativeFilePath.includes('\\graphql\\') ||
    relativeFilePath.includes('\\gql\\');

  if (isInGraphQLDir) return true;

  try {
    const content = await fs.readFile(absoluteFilePath, 'utf-8');
    return (
      content.includes("from '@/gql/graphql'") ||
      content.includes('from "@/gql/graphql"') ||
      content.includes("from '@/graphql/") ||
      content.includes('from "@/graphql/') ||
      content.includes('@apollo/client')
    );
  } catch {
    return false;
  }
}

function filterErrorsForFile(
  output: string,
  relativeFilePath: string,
  normalizedRelative: string,
  filePath: string,
): string {
  const allLines = output.split('\n');
  const errorLines = allLines.filter((line) => line.includes('error TS'));
  debugTypeCheck(`[filterErrorsForFile] Total lines: ${allLines.length}, Error lines: ${errorLines.length}`);

  const filteredErrors = output
    .split('\n')
    .filter((line) => {
      const hasError = line.includes('error TS');
      const notNodeModules = !line.includes('node_modules');
      const matchesTarget =
        line.includes(relativeFilePath) || line.includes(normalizedRelative) || line.includes(path.basename(filePath));

      if (hasError) {
        debugTypeCheck(`[filterErrorsForFile] Checking error line: ${line.substring(0, 150)}`);
        debugTypeCheck(
          `[filterErrorsForFile]   hasError: ${hasError}, notNodeModules: ${notNodeModules}, matchesTarget: ${matchesTarget}`,
        );
      }

      return hasError && notNodeModules && matchesTarget;
    })
    .join('\n');

  debugTypeCheck(`[filterErrorsForFile] Filtered errors length: ${filteredErrors.length} chars`);
  return filteredErrors;
}

function formatTypeCheckErrors(regularErrors: string, graphqlStrictErrors: string): string {
  let formattedOutput = '';

  if (graphqlStrictErrors.trim().length > 0) {
    formattedOutput += '## GraphQL Schema Type Errors (strict mode)\n\n';
    formattedOutput += 'These errors indicate fields/properties that violate GraphQL schema type contracts.\n';
    formattedOutput += 'Common causes:\n';
    formattedOutput += '- Using fields not defined in the GraphQL schema\n';
    formattedOutput += '- Incorrect property types in mutation variables\n';
    formattedOutput += '- Missing required fields in input types\n\n';
    formattedOutput += graphqlStrictErrors;
    formattedOutput += '\n\n';
    formattedOutput += '**Fix**: Check @/gql/graphql.ts for the exact type definition and valid fields.\n\n';
    formattedOutput += '---\n\n';
  }

  if (regularErrors.trim().length > 0) {
    formattedOutput += '## TypeScript Errors\n\n';
    formattedOutput += regularErrors;
  }

  return formattedOutput.trim();
}

async function findProjectRoot(startDir: string): Promise<string> {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    try {
      await fs.access(path.join(dir, 'package.json'));
      await fs.access(path.join(dir, 'tsconfig.json'));
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error('Could not find project root (no package.json or tsconfig.json found)');
}

interface ComponentUsageInfo {
  usageExamples: Array<{ file: string; snippet: string }>;
  requiresChildren: boolean;
  detectedProps: string[];
}

async function extractComponentUsageFromScaffolds(
  componentName: string,
  componentType: 'molecule' | 'organism',
  projectDir: string,
): Promise<ComponentUsageInfo> {
  const usageExamples: Array<{ file: string; snippet: string }> = [];
  let requiresChildren = false;
  const detectedProps: string[] = [];

  const searchDirs: string[] = [];
  if (componentType === 'molecule') {
    searchDirs.push(path.join(projectDir, 'src', 'components', 'organisms'));
    searchDirs.push(path.join(projectDir, 'src', 'components', 'pages'));
  } else if (componentType === 'organism') {
    searchDirs.push(path.join(projectDir, 'src', 'components', 'pages'));
  }

  for (const dir of searchDirs) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.tsx')) continue;

        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const openTagPattern = new RegExp(`<${componentName}(?:\\s|>)`, 'g');
        if (!openTagPattern.test(content)) continue;

        const withChildrenPattern = new RegExp(`<${componentName}[^>]*>([\\s\\S]*?)</${componentName}>`, 'g');

        const hasChildren = withChildrenPattern.test(content);
        if (hasChildren) {
          requiresChildren = true;
        }

        const lines = content.split('\n');
        const usageLineIndexes: number[] = [];
        lines.forEach((line, idx) => {
          if (line.includes(`<${componentName}`)) {
            usageLineIndexes.push(idx);
          }
        });

        if (usageLineIndexes.length > 0) {
          const lineIdx = usageLineIndexes[0];
          const start = Math.max(0, lineIdx - 2);
          const end = Math.min(lines.length, lineIdx + 8);
          const snippet = lines.slice(start, end).join('\n');
          usageExamples.push({
            file: path.relative(projectDir, filePath),
            snippet,
          });
        }
      }
    } catch {
      //  ignore read errors
    }
  }

  return { usageExamples, requiresChildren, detectedProps };
}

function makeBasePrompt(
  componentType: string,
  componentName: string,
  componentDef: Record<string, unknown>,
  existingScaffold: string,
  projectConfig: Record<string, string>,
  designSystemReference: string,
  dependencySources: Record<string, string>,
  usageInfo: ComponentUsageInfo,
): string {
  const hasScaffold = Boolean(existingScaffold?.trim());

  const configSection =
    Object.entries(projectConfig)
      .map(([p, c]) => `### ${p}\n${c}`)
      .join('\n\n') || '(No additional config files)';

  const designSystemBlock = designSystemReference.trim()
    ? designSystemReference
    : '(No design system content provided)';

  const dependencySection =
    Object.entries(dependencySources)
      .map(([name, src]) => `### ${name}\n${src}`)
      .join('\n\n') || '(No dependencies found)';

  return `
# Implement ${componentName} (${componentType})

You are a senior frontend engineer specializing in **React + TypeScript + Apollo Client**.  
Your task is to build a visually excellent, type-safe, and production-ready ${componentType} component.  
The goal is to deliver elegant, minimal, and robust code that integrates perfectly with the existing system.

---

## Objective
Implement **${componentName}** as defined in the IA schema and design system.  
Your component must:
- Compile cleanly with no TypeScript errors.
- Follow established design tokens, colors, and spacing.
- Be visually polished, responsive, and accessible.
- Reuse existing atoms/molecules/organisms wherever possible.
- Use valid imports only — no new dependencies or mock data.

---

## IA Schema
${JSON.stringify(componentDef, null, 2)}

---

## Project Context

**Purpose:** A reusable UI element connected to the GraphQL layer and design system.  

## Component Scaffold

${
  hasScaffold
    ? `The scaffold below contains:
- Import statements for all dependencies (use these exact imports)
- Type guidance comments showing GraphQL queries/mutations/enums to use
- Specs describing required functionality
- Component structure to implement

**CRITICAL**: Follow the import statements and type guidance comments in the scaffold exactly.

${existingScaffold}`
    : '(No existing scaffold found - create component from scratch)'
}

---

## Design System
${designSystemBlock}

---

## Available Dependencies

${dependencySection}

---

## Project Configuration
${configSection}

---

## Implementation Rules

**Type Safety**
- No \`any\` or \`as SomeType\` - type correctly
- Import types from dependencies - never redefine them locally
- Type all props, state, and GraphQL responses explicitly

**Imports**
- Use exact imports from scaffold and dependencies section
- Pattern: \`@/components/{type}/{component}\`
- Never use relative paths (\`../\`)
- Only use packages from package.json shown above

**GraphQL (if applicable)**
- **CRITICAL**: NEVER use inline gql template literals or import gql from @apollo/client
- **CRITICAL**: ALWAYS import pre-generated operations from @/graphql/queries or @/graphql/mutations
- Follow type guidance comments in scaffold for exact query/mutation names
- Use pattern: \`const { data } = useQuery(QueryName)\` where QueryName is imported from @/graphql/queries
- Use pattern: \`const [mutate, { loading }] = useMutation(MutationName, { refetchQueries: [...], awaitRefetchQueries: true })\`
- Access enum values: \`EnumName.Value\` (e.g., \`TodoStateStatus.Pending\`)
- **CRITICAL**: ALL mutations return \`{ success: Boolean!, error: { type: String!, message: String } }\`
- **CRITICAL**: ALWAYS check \`data?.mutationName?.success\` before considering mutation successful
- **CRITICAL**: ALWAYS handle \`data?.mutationName?.error?.message\` when \`success\` is false
- **CRITICAL**: ALWAYS use \`loading\` state to disable buttons during mutations: \`disabled={loading}\`
- **CRITICAL**: ALWAYS wrap mutations in try-catch for network errors
- **CRITICAL**: Use \`awaitRefetchQueries: true\` to prevent race conditions with polling queries

**React Best Practices**
- No setState during render
- Include dependency arrays in useEffect
- Use optional chaining (?.) and nullish coalescing (??)
${
  usageInfo.requiresChildren
    ? `\n**CRITICAL**: This component MUST accept \`children?: React.ReactNode\` prop based on parent usage patterns.`
    : ''
}

**Visual & UX Quality**
- Perfect spacing and alignment using Tailwind or the design system tokens.
- Add subtle hover, focus, and loading states.
- Use accessible HTML semantics and ARIA attributes.
- Animate with Framer Motion when appropriate.

**Performance**
- Prevent unnecessary re-renders with React.memo and stable references.
- Avoid redundant state and computations.

**Consistency**
- Follow established color, typography, and spacing scales.
- Match button, card, and badge styles with existing components.

**Prohibited**
- No placeholder data or TODOs
- No new external packages not in package.json
- No reimplementing dependencies inline
- No redefining types that dependencies export

---

## Visual Quality Checklist
- Consistent vertical rhythm and alignment.  
- Smooth hover and transition states.  
- Responsive design that looks intentional at all breakpoints.  
- Uses design tokens and existing components wherever possible.  
- Clear visual hierarchy and accessible structure.

---

## Validation Checklist
- Compiles cleanly with \`tsc --noEmit\`.  
- Imports exist and resolve correctly.  
- Component matches the design system and IA schema.  
- No unused props, variables, or imports.  
- Visually and functionally complete.

---

**Output**: Return ONLY the complete .tsx source code - no markdown fences or commentary.
`.trim();
}

function makeImplementPrompt(basePrompt: string, graphqlFiles?: Record<string, string>): string {
  const hasGraphQLFiles = graphqlFiles !== undefined && Object.keys(graphqlFiles).length > 0;
  const graphqlSection = hasGraphQLFiles
    ? `
## GraphQL Type Definitions (Source of Truth)

**CRITICAL**: Use these exact TypeScript definitions for GraphQL types, queries, and mutations.

${Object.entries(graphqlFiles)
  .map(([filePath, content]) => `### ${filePath}\n\`\`\`typescript\n${content}\n\`\`\``)
  .join('\n\n')}

---

`
    : '';

  return `${basePrompt}

${graphqlSection}---

Begin directly with import statements and end with the export statement.
Do not include markdown fences, comments, or explanations — only the valid .tsx file content.
`.trim();
}

function validateComponentImport(componentType: string, filename: string, registry: ComponentRegistry): string | null {
  const importPath = `@/components/${componentType}/${filename}`;
  const exists = Array.from(registry.values()).some(
    (entry) => entry.type === componentType && entry.actualFilename === filename,
  );

  if (exists) {
    return null;
  }

  const suggestions = Array.from(registry.values())
    .filter((entry) => entry.actualFilename.includes(filename) || filename.includes(entry.actualFilename))
    .map((entry) => `@/components/${entry.type}/${entry.actualFilename}`)
    .slice(0, 3);

  if (suggestions.length > 0) {
    return `Import not found: ${importPath}\nDid you mean: ${suggestions.join(', ')}?`;
  }
  return `Import not found: ${importPath}`;
}

function validateNonComponentImport(importPath: string): string | null {
  if (importPath.startsWith('@/store/')) {
    return `Invalid import: ${importPath}\nThis project uses Apollo Client with GraphQL. Check the GraphQL files in context for available queries and mutations.`;
  }
  return null;
}

function validateImports(code: string, registry: ComponentRegistry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const componentImportPattern = /import\s+[^'"]*from\s+['"]@\/components\/([^/]+)\/([^'"]+)['"]/g;
  let match;
  while ((match = componentImportPattern.exec(code)) !== null) {
    const error = validateComponentImport(match[1], match[2], registry);
    if (error !== null) {
      errors.push(error);
    }
  }

  const allImportPattern = /import\s+[^'"]*from\s+['"](@\/[^'"]+)['"]/g;
  while ((match = allImportPattern.exec(code)) !== null) {
    const error = validateNonComponentImport(match[1]);
    if (error !== null) {
      errors.push(error);
    }
  }

  return { valid: errors.length === 0, errors };
}

function makeRetryPrompt(
  componentName: string,
  previousErrors: string,
  composition: string[],
  dependencySummary: string,
  importValidationErrors: string[],
  description: string,
  existingScaffold: string,
  packageJson: string,
  graphqlFiles?: Record<string, string>,
): string {
  const compositionHint = composition.length > 0 ? `\n**Required Components**: ${composition.join(', ')}\n` : '';

  const importErrorsHint =
    importValidationErrors.length > 0
      ? `\n**Import Errors**:\n${importValidationErrors.map((err) => `- ${err}`).join('\n')}\n`
      : '';

  const hasScaffold = Boolean(existingScaffold?.trim());
  const scaffoldSection = hasScaffold
    ? `
## Scaffold with Type Guidance

**CRITICAL**: Follow the type guidance comments in the scaffold for exact GraphQL operation names, enum values, and import patterns.

${existingScaffold}

---
`
    : '';

  const hasGraphQLFiles = graphqlFiles !== undefined && Object.keys(graphqlFiles).length > 0;
  const graphqlSection = hasGraphQLFiles
    ? `
## GraphQL Type Definitions (Source of Truth)

**CRITICAL**: Use these exact TypeScript definitions for GraphQL types, queries, and mutations.

${Object.entries(graphqlFiles)
  .map(([filePath, content]) => `### ${filePath}\n\`\`\`typescript\n${content}\n\`\`\``)
  .join('\n\n')}

---
`
    : '';

  return `
# Fix TypeScript Errors: ${componentName}

${description ? `**Description**: ${description}\n` : ''}
${compositionHint}
${scaffoldSection}
${graphqlSection}
## Project Dependencies (package.json)

**CRITICAL**: Only import packages that exist in the dependencies below.

${packageJson}

---

## Available Components

${dependencySummary}

---

## Errors to Fix

${previousErrors}

${importErrorsHint}
**Hints**:
- Follow scaffold's type guidance comments for exact operation names and enum values
${hasGraphQLFiles ? '- Use the GraphQL Type Definitions section above for exact types, interfaces, and enums' : '- Check @/gql/graphql.ts for GraphQL type definitions'}
- **CRITICAL**: NEVER use inline \`gql\` template literals - ALWAYS import from @/graphql/queries or @/graphql/mutations
- Use pattern: \`mutate({ variables: { input: InputType } })\`
- Import pattern: \`@/components/{type}/{component}\`
- Import types from dependencies - never redefine them

---

**Output**: Return ONLY the corrected ${componentName}.tsx code - no markdown fences or commentary.
`.trim();
}

/* -------------------------------------------------------------------------- */

function extractComposition(componentDef: Record<string, unknown>): string[] {
  if ('composition' in componentDef && Boolean(componentDef.composition)) {
    const comp = componentDef.composition as Record<string, unknown>;
    if ('atoms' in comp && Array.isArray(comp.atoms)) return comp.atoms as string[];
    if ('molecules' in comp && Array.isArray(comp.molecules)) return comp.molecules as string[];
  }
  return [];
}

function extractSpecs(componentDef: Record<string, unknown>): string[] {
  return Array.isArray(componentDef.specs) ? (componentDef.specs as string[]) : [];
}

function isValidCollection(collection: unknown): collection is { items: Record<string, unknown> } {
  if (collection === null || collection === undefined) return false;
  if (typeof collection !== 'object') return false;
  if (!('items' in collection)) return false;
  const items = (collection as { items: unknown }).items;
  return typeof items === 'object' && items !== null;
}

async function buildComponentRegistry(projectDir: string): Promise<ComponentRegistry> {
  const registry: ComponentRegistry = new Map();
  const types: Array<'atoms' | 'molecules' | 'organisms'> = ['atoms', 'molecules', 'organisms'];

  for (const type of types) {
    const dir = path.join(projectDir, 'src', 'components', type);
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (!file.endsWith('.tsx')) continue;

        const fullPath = path.join(dir, file);
        const content = await fs.readFile(fullPath, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

        const exportedTypes = extractAllExportedTypes(sourceFile);
        const exportedComponents = extractExportedComponentNames(sourceFile);
        const allExports = [...new Set([...exportedTypes, ...exportedComponents])];

        if (allExports.length === 0) continue;

        const actualFilename = file.replace('.tsx', '');

        for (const exportName of allExports) {
          registry.set(exportName, {
            name: exportName,
            actualFilename,
            type,
            exports: allExports,
          });
        }
      }
    } catch (error) {
      debugProcess(`[buildComponentRegistry] Could not read ${type} directory: ${String(error)}`);
    }
  }

  debugProcess(`[buildComponentRegistry] Indexed ${registry.size} components`);
  return registry;
}

function resolveDependenciesToRegistry(
  dependencies: Array<{ type: string; name: string }>,
  registry: ComponentRegistry,
): {
  primary: ComponentRegistryEntry[];
  available: ComponentRegistryEntry[];
} {
  const primary: ComponentRegistryEntry[] = [];

  debugProcess(
    `[resolveDependenciesToRegistry] Processing ${dependencies.length} dependencies: ${dependencies.map((d) => `${d.type}/${d.name}`).join(', ')}`,
  );

  for (const dep of dependencies) {
    const entry = registry.get(dep.name);
    if (entry !== undefined) {
      debugProcess(`[resolveDependenciesToRegistry] Found registry entry for ${dep.name}`);
      primary.push(entry);
    } else {
      debugProcess(`[resolveDependenciesToRegistry] No registry entry for ${dep.name}`);
    }
  }

  const available = Array.from(registry.values()).filter((entry) => entry.type === 'atoms');

  debugProcess(`[resolveDependenciesToRegistry] Resolved ${primary.length} primary dependencies`);
  return { primary, available };
}

async function readDesignSystem(
  providedPath: string,
  refs: { projectDir: string; iaSchemeDir: string },
): Promise<string> {
  const start = performance.now();
  const candidates: string[] = [];
  if (providedPath) {
    candidates.push(providedPath);
    if (!path.isAbsolute(providedPath)) {
      candidates.push(path.resolve(refs.projectDir, providedPath));
      candidates.push(path.resolve(refs.iaSchemeDir, providedPath));
    }
  }

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(candidate, 'utf-8');
      debugProcess(`[readDesignSystem] Loaded from ${candidate} in ${(performance.now() - start).toFixed(2)} ms`);
      return content;
    } catch {
      debugProcess(`[readDesignSystem] Could not read design system from %s`, candidate);
    }
  }

  debugProcess(`[readDesignSystem] Design system not found, elapsed ${(performance.now() - start).toFixed(2)} ms`);
  return '';
}
