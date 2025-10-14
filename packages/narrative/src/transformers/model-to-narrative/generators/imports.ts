type BuildImportsOpts = { flowImport: string; integrationImport: string };

export const ALL_FLOW_FUNCTION_NAMES = [
  'command',
  'query',
  'react',
  'experience',
  'narrative',
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

  const flowValueNames = usedFlowFunctionNames.length > 0 ? [...usedFlowFunctionNames].sort() : [];

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

  const importFlowValues =
    flowValueNames.length > 0
      ? f.createImportDeclaration(
          undefined,
          f.createImportClause(
            false,
            undefined,
            f.createNamedImports([
              ...flowValueNames.map((n) => f.createImportSpecifier(false, undefined, f.createIdentifier(n))),
            ]),
          ),
          f.createStringLiteral(opts.flowImport),
        )
      : null;

  const importFlowTypes =
    flowTypeNames.length > 0
      ? f.createImportDeclaration(
          undefined,
          f.createImportClause(
            true,
            undefined,
            f.createNamedImports([
              ...flowTypeNames.map((n) => f.createImportSpecifier(false, undefined, f.createIdentifier(n))),
            ]),
          ),
          f.createStringLiteral(opts.flowImport),
        )
      : null;

  const importIntegrationValues =
    valueIntegrationNames.length > 0
      ? f.createImportDeclaration(
          undefined,
          f.createImportClause(
            false,
            undefined,
            f.createNamedImports([
              ...valueIntegrationNames.map((n) => f.createImportSpecifier(false, undefined, f.createIdentifier(n))),
            ]),
          ),
          f.createStringLiteral(opts.integrationImport),
        )
      : null;

  const importIntegrationTypes =
    typeIntegrationNames.length > 0
      ? f.createImportDeclaration(
          undefined,
          f.createImportClause(
            true,
            undefined,
            f.createNamedImports([
              ...typeIntegrationNames.map((n) => f.createImportSpecifier(false, undefined, f.createIdentifier(n))),
            ]),
          ),
          f.createStringLiteral(opts.integrationImport),
        )
      : null;

  return {
    importFlowValues,
    importFlowTypes,
    importIntegrationValues,
    importIntegrationTypes,
  };
}
