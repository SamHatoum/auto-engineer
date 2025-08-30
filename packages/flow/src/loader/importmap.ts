import createDebug from 'debug';

export async function createEnhancedImportMap(base: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const [flowMod, fluentMod, buildersMod, testingMod, dataFlowMod, flowReg, intReg] = await Promise.all([
    import('../flow'),
    import('../fluent-builder'),
    import('../builders'),
    import('../testing'),
    import('../data-flow-builders'),
    import('../flow-registry'),
    import('../integration-registry'),
  ]);

  return {
    ...base,

    // common internal conveniences
    '../flow': flowMod,
    '../fluent-builder': fluentMod,
    '../builders': buildersMod,
    '../testing': testingMod,
    '../data-flow-builders': dataFlowMod,
    '../flow-registry': flowReg,
    '../integration-registry': intReg,

    './flow': flowMod,
    './fluent-builder': fluentMod,
    './builders': buildersMod,
    './testing': testingMod,
    './data-flow-builders': dataFlowMod,

    // externals
    'graphql-tag': (await import('graphql-tag')).default ?? (await import('graphql-tag')),
    zod: await import('zod'),
    debug: { default: createDebug },
  };
}
