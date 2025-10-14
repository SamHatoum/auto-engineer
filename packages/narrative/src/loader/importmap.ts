import createDebug from 'debug';

function ensureESModuleInterop(mod: unknown): unknown {
  const m = mod as Record<string, unknown> | null;
  if (m !== null && typeof m === 'object') {
    if ('default' in m && Object.keys(m).length === 1) {
      return m.default ?? m;
    }

    const interopMod = { ...m };
    if (!('__esModule' in m)) {
      Object.defineProperty(interopMod, '__esModule', {
        value: true,
        enumerable: false,
        writable: false,
        configurable: false,
      });
    }
    return interopMod;
  }
  return m;
}

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
    import('../narrative'),
    import('../fluent-builder'),
    import('../testing'),
    import('../data-narrative-builders'),
    import('../narrative-registry'),
    import('../integration-registry'),
    import('../index'),
    import('zod'),
    import('graphql-tag'),
    import('debug'),
  ]);

  return {
    ...base,
    '../narrative': ensureESModuleInterop(flowMod),
    '../fluent-builder': ensureESModuleInterop(fluentMod),
    '../testing': ensureESModuleInterop(testingMod),
    '../data-narrative-builders': ensureESModuleInterop(dataFlowMod),
    '../narrative-registry': ensureESModuleInterop(flowReg),
    '../integration-registry': ensureESModuleInterop(intReg),
    './flow': ensureESModuleInterop(flowMod),
    './fluent-builder': ensureESModuleInterop(fluentMod),
    './testing': ensureESModuleInterop(testingMod),
    './data-flow-builders': ensureESModuleInterop(dataFlowMod),
    '@auto-engineer/narrative': ensureESModuleInterop(selfEntry),
    zod: ensureESModuleInterop(zod),
    'graphql-tag': (gqlTag as { default?: unknown }).default ?? gqlTag,
    debug: { default: (debugMod as { default?: unknown }).default ?? createDebug },
  };
}
