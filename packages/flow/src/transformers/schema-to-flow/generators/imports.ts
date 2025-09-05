type BuildImportsOpts = { flowImport: string; integrationImport: string };

export function buildImports(
  ts: typeof import('typescript'),
  opts: BuildImportsOpts,
  messages: Array<{ type: string; name: string }>,
  typeIntegrationNames: string[],
  valueIntegrationNames: string[] = [],
) {
  const f = ts.factory;

  // Flow value and type imports in one statement as expected
  const flowValueNames = [
    'commandSlice',
    'querySlice',
    'reactSlice',
    'flow',
    'should',
    'given',
    'when',
    'specs',
    'gql',
    'source',
    'data',
    'sink',
  ];

  const flowTypeNames = ['Command', 'Event', 'State'];

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

  // Integration imports - completely derived from schema data
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
