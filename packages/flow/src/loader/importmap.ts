import createDebug from 'debug';

export async function createEnhancedImportMap(base: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  // internal modules used by flows
  const [
    flowMod,
    fluentMod,
    testingMod,
    dataFlowMod,
    flowReg,
    intReg,
    selfEntry,
    // externals
    zod,
    gqlTag,
    debugMod,
  ] = await Promise.all([
    import('../flow'),
    import('../fluent-builder'),
    import('../testing'),
    import('../data-flow-builders'),
    import('../flow-registry'),
    import('../integration-registry'),
    import('../index'),
    import('zod'),
    import('graphql-tag'),
    import('debug'),
  ]);

  return {
    ...base,
    '../flow': flowMod,
    '../fluent-builder': fluentMod,
    '../testing': testingMod,
    '../data-flow-builders': dataFlowMod,
    '../flow-registry': flowReg,
    '../integration-registry': intReg,
    './flow': flowMod,
    './fluent-builder': fluentMod,
    './testing': testingMod,
    './data-flow-builders': dataFlowMod,
    '@auto-engineer/flow': selfEntry,
    zod,
    'graphql-tag': (gqlTag as { default?: unknown }).default ?? gqlTag,
    debug: { default: (debugMod as { default?: unknown }).default ?? createDebug },
  };
}
