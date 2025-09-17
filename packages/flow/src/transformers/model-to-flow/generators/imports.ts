type BuildImportsOpts = { flowImport: string; integrationImport: string };

export const ALL_FLOW_FUNCTION_NAMES = [
  'command',
  'query',
  'react',
  'experience',
  'flow',
  'should',
  'specs',
  'rule',
  'example',
  'gql',
  'source',
  'data',
  'sink',
] as const;

export function buildImports(
  ts: typeof import('typescript'),
  opts: BuildImportsOpts,
  messages: Array<{ type: string; name: string }>,
  typeIntegrationNames: string[],
  valueIntegrationNames: string[] = [],
  usedFlowFunctionNames: string[] = [],
) {
  const f = ts.factory;

  const flowValueNames =
    usedFlowFunctionNames.length > 0 ? [...usedFlowFunctionNames].sort() : [...ALL_FLOW_FUNCTION_NAMES].sort();

  // Determine which flow types are actually needed based on the messages
  const usedMessageTypes = new Set(messages.map((msg) => msg.type));
  const typeMapping: Record<string, string> = {
    command: 'Command',
    event: 'Event',
    state: 'State',
  };

  const flowTypeNames = Array.from(usedMessageTypes)
    .map((type) => typeMapping[type])
    .filter(Boolean)
    .sort();

  // Create combined flow import with values first, then types
  const importFlowCombined = f.createImportDeclaration(
    undefined,
    f.createImportClause(
      false,
      undefined,
      f.createNamedImports([
        // Regular value imports
        ...flowValueNames.map((n) => f.createImportSpecifier(false, undefined, f.createIdentifier(n))),
        // Type-only imports
        ...flowTypeNames.map((n) => f.createImportSpecifier(true, undefined, f.createIdentifier(n))),
      ]),
    ),
    f.createStringLiteral(opts.flowImport),
  );

  // Integration imports - derived from schema data
  const hasIntegrationImports = valueIntegrationNames.length > 0 || typeIntegrationNames.length > 0;

  const importIntegrationCombined = hasIntegrationImports
    ? f.createImportDeclaration(
        undefined,
        f.createImportClause(
          false,
          undefined,
          f.createNamedImports([
            // Regular value imports
            ...valueIntegrationNames.map((n) => f.createImportSpecifier(false, undefined, f.createIdentifier(n))),
            // Type-only imports
            ...typeIntegrationNames.map((n) => f.createImportSpecifier(true, undefined, f.createIdentifier(n))),
          ]),
        ),
        f.createStringLiteral(opts.integrationImport),
      )
    : null;

  return {
    importFlowValues: importFlowCombined,
    importFlowTypes: null, // Combined above
    importIntegrationValues: null,
    importIntegrationTypes: importIntegrationCombined,
  };
}
