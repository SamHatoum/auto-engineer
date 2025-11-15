import { Narrative, Message, Model, Slice } from '../../index';
import { globalIntegrationRegistry } from '../../integration-registry';
import { integrationExportRegistry } from '../../integration-export-registry';
import { TypeInfo } from '../../loader/ts-utils';
import { resolveInferredType } from './type-inference';
import { inlineAllMessageFieldTypes } from './inlining';
import { ExampleShapeHints, applyExampleShapeHints } from './example-shapes';
import { extractMessagesFromIntegrations, processDataItemIntegrations } from './integrations';
import { matchesNarrativePattern } from './strings';
import { assembleSpecs } from './assemble';
import { processGiven, processWhen, processThen } from './spec-processors';

type TypeResolver = (
  t: string,
  expected?: 'command' | 'event' | 'state',
  exampleData?: unknown,
) => { resolvedName: string; typeInfo: TypeInfo | undefined };

function buildUnionTypes(typesByFile?: Map<string, Map<string, TypeInfo>>): Map<string, TypeInfo> | undefined {
  if (!typesByFile) return undefined;
  const u = new Map<string, TypeInfo>();
  for (const [, m] of typesByFile) for (const [k, v] of m) u.set(k, v);
  return u.size ? u : undefined;
}

function getTypesForNarrative(
  flow: Narrative,
  typesByFile?: Map<string, Map<string, TypeInfo>>,
): Map<string, TypeInfo> | undefined {
  if (!typesByFile) return undefined;

  const sf = (flow as Record<string, unknown>).sourceFile as string | undefined;
  if (typeof sf === 'string') {
    const exact = typesByFile.get(sf) || typesByFile.get(sf.replace(/\\/g, '/'));
    if (exact && exact.size > 0) return exact;
  }

  for (const [filePath, fileTypes] of typesByFile) {
    const fileName = filePath.toLowerCase();
    if (matchesNarrativePattern(fileName, flow.name)) {
      return fileTypes;
    }
  }
  return undefined;
}

function tryResolveFromNarrativeTypes(
  t: string,
  narrativeSpecificTypes: Map<string, TypeInfo>,
  expected?: 'command' | 'event' | 'state',
  exampleData?: unknown,
): { resolvedName: string; typeInfo: TypeInfo | undefined } {
  if (t !== 'InferredType') {
    const typeInfo = narrativeSpecificTypes.get(t);
    if (typeInfo) {
      return { resolvedName: t, typeInfo };
    }
    const inferredName = resolveInferredType(t, narrativeSpecificTypes, expected, exampleData);
    return { resolvedName: inferredName, typeInfo: narrativeSpecificTypes.get(inferredName) };
  }

  const inferredName = resolveInferredType(t, narrativeSpecificTypes, expected, exampleData);
  return { resolvedName: inferredName, typeInfo: narrativeSpecificTypes.get(inferredName) };
}

function tryFallbackToUnionTypes(
  t: string,
  resolvedName: string,
  typeInfo: TypeInfo | undefined,
  unionTypes: Map<string, TypeInfo>,
  expected?: 'command' | 'event' | 'state',
  exampleData?: unknown,
): { resolvedName: string; typeInfo: TypeInfo | undefined } {
  if (resolvedName !== 'InferredType' && typeInfo) {
    return { resolvedName, typeInfo };
  }

  const fallbackName = resolveInferredType(t, unionTypes, expected, exampleData);
  const fallbackTypeInfo = unionTypes.get(fallbackName);

  if (fallbackName !== 'InferredType' && fallbackTypeInfo) {
    return { resolvedName: fallbackName, typeInfo: fallbackTypeInfo };
  }

  return { resolvedName, typeInfo };
}

function tryResolveFromUnionTypes(
  t: string,
  unionTypes: Map<string, TypeInfo>,
  expected?: 'command' | 'event' | 'state',
  exampleData?: unknown,
): { resolvedName: string; typeInfo: TypeInfo | undefined } {
  if (t !== 'InferredType') {
    const typeInfo = unionTypes.get(t);
    if (typeInfo) {
      return { resolvedName: t, typeInfo };
    }
    const inferredName = resolveInferredType(t, unionTypes, expected, exampleData);
    return { resolvedName: inferredName, typeInfo: unionTypes.get(inferredName) };
  }

  const inferredName = resolveInferredType(t, unionTypes, expected, exampleData);
  return { resolvedName: inferredName, typeInfo: unionTypes.get(inferredName) };
}

function createTypeResolver(
  narrativeSpecificTypes: Map<string, TypeInfo> | undefined,
  unionTypes: Map<string, TypeInfo> | undefined,
) {
  return (
    t: string,
    expected?: 'command' | 'event' | 'state',
    exampleData?: unknown,
  ): { resolvedName: string; typeInfo: TypeInfo | undefined } => {
    if (narrativeSpecificTypes) {
      const result = tryResolveFromNarrativeTypes(t, narrativeSpecificTypes, expected, exampleData);
      if (unionTypes) {
        return tryFallbackToUnionTypes(t, result.resolvedName, result.typeInfo, unionTypes, expected, exampleData);
      }
      return result;
    }

    if (unionTypes) {
      return tryResolveFromUnionTypes(t, unionTypes, expected, exampleData);
    }

    return { resolvedName: t, typeInfo: undefined };
  };
}

function getServerSpecs(slice: Slice) {
  if ('server' in slice && slice.server?.specs !== undefined) {
    return slice.server.specs;
  }
  return undefined;
}

function processSliceSpecs(
  slice: Slice,
  resolveTypeAndInfo: TypeResolver,
  messages: Map<string, Message>,
  exampleShapeHints: ExampleShapeHints,
): void {
  const serverSpec = getServerSpecs(slice);

  if (serverSpec !== undefined && Array.isArray(serverSpec.rules)) {
    serverSpec.rules.forEach((rule: unknown) => {
      if (
        typeof rule === 'object' &&
        rule !== null &&
        'examples' in rule &&
        Array.isArray((rule as { examples: unknown[] }).examples)
      ) {
        const ruleObj = rule as { examples: { given?: unknown; when?: unknown; then?: unknown }[] };
        ruleObj.examples.forEach((example) => {
          if (example.given !== undefined && example.given !== null) {
            const givenArray = Array.isArray(example.given) ? example.given : [example.given];
            processGiven(givenArray, resolveTypeAndInfo, messages, exampleShapeHints);
          }
          if (example.when !== undefined && example.when !== null) {
            const whenArray = Array.isArray(example.when) ? example.when : [example.when];
            processWhen(whenArray, slice, resolveTypeAndInfo, messages, exampleShapeHints);
          }
          if (example.then !== undefined && example.then !== null) {
            const thenArray = Array.isArray(example.then) ? example.then : [example.then];
            processThen(thenArray, resolveTypeAndInfo, messages, exampleShapeHints);
          }
        });
      }
    });
  }
}

function processSliceIntegrations(
  slice: Slice,
  integrations: Map<string, { name: string; description?: string; source: string }>,
  messages: Map<string, Message>,
): void {
  // Integrations: from data & via
  if ('server' in slice && slice.server != null && 'data' in slice.server && slice.server.data !== undefined) {
    slice.server.data.forEach((d: unknown) => {
      processDataItemIntegrations(d, integrations, messages);
    });
  }
  if ('via' in slice && slice.via) {
    slice.via.forEach((integrationName: string) => {
      if (!integrations.has(integrationName)) {
        const sourcePath = integrationExportRegistry.getSourcePath(integrationName);
        if (sourcePath !== null && sourcePath !== undefined && sourcePath !== '') {
          integrations.set(integrationName, {
            name: integrationName,
            description: `${integrationName} integration`,
            source: sourcePath,
          });
        }
      }
    });
  }
}

function processNarrative(
  flow: Narrative,
  getNarrativeSpecificTypes: (narrative: Narrative) => Map<string, TypeInfo> | undefined,
  unionTypes: Map<string, TypeInfo> | undefined,
  messages: Map<string, Message>,
  integrations: Map<string, { name: string; description?: string; source: string }>,
  exampleShapeHints: ExampleShapeHints,
): void {
  const narrativeSpecificTypes = getNarrativeSpecificTypes(flow);
  const resolveTypeAndInfo = createTypeResolver(narrativeSpecificTypes, unionTypes);

  flow.slices.forEach((slice: Narrative['slices'][number]) => {
    processSliceSpecs(slice, resolveTypeAndInfo, messages, exampleShapeHints);
    processSliceIntegrations(slice, integrations, messages);
  });
}

export const narrativesToModel = (narratives: Narrative[], typesByFile?: Map<string, Map<string, TypeInfo>>): Model => {
  const messages = new Map<string, Message>();
  const integrations = new Map<
    string,
    {
      name: string;
      description?: string;
      source: string;
    }
  >();
  const exampleShapeHints: ExampleShapeHints = new Map();

  // Pull messages defined by registered integrations first
  const registeredIntegrations = globalIntegrationRegistry.getAll();
  const integrationMessages = extractMessagesFromIntegrations(registeredIntegrations);
  for (const msg of integrationMessages) {
    if (!messages.has(msg.name)) messages.set(msg.name, msg);
  }

  // Build a union of all discovered types (global fallback across files)
  const unionTypes = buildUnionTypes(typesByFile);

  // pick the best map for a given flow
  const getNarrativeSpecificTypes = (narrative: Narrative): Map<string, TypeInfo> | undefined => {
    return getTypesForNarrative(narrative, typesByFile);
  };

  narratives.forEach((narrative) =>
    processNarrative(narrative, getNarrativeSpecificTypes, unionTypes, messages, integrations, exampleShapeHints),
  );
  // Ensure all registered integrations are listed
  for (const integration of registeredIntegrations) {
    const exportName = integrationExportRegistry.getExportNameForIntegration(integration);
    if (!integrations.has(exportName)) {
      const sourcePath = integrationExportRegistry.getSourcePath(exportName);
      if (sourcePath !== null && sourcePath !== undefined && sourcePath !== '') {
        integrations.set(exportName, {
          name: exportName,
          description: `${exportName} integration`,
          source: sourcePath,
        });
      }
    }
  }
  // Apply example-driven structural shapes (e.g., Array<Product> -> Array<{ ... }>)
  applyExampleShapeHints(messages, exampleShapeHints);
  // Then inline resolvable identifiers via TypeInfo (if available)
  if (unionTypes) {
    inlineAllMessageFieldTypes(messages, unionTypes);
  }

  return assembleSpecs(narratives, Array.from(messages.values()), Array.from(integrations.values()));
};
