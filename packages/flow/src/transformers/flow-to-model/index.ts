import { Flow, Message, Model } from '../../index';
import { globalIntegrationRegistry } from '../../integration-registry';
import { integrationExportRegistry } from '../../integration-export-registry';
import { TypeInfo } from '../../loader/ts-utils';
import { resolveInferredType } from './type-inference';
import { inlineAllMessageFieldTypes } from './inlining';
import { ExampleShapeHints, applyExampleShapeHints } from './example-shapes';
import { extractMessagesFromIntegrations, processDataItemIntegrations } from './integrations';
import { matchesFlowPattern } from './strings';
import { assembleSpecs } from './assemble';
import { processGiven, processWhen, processThen } from './spec-processors';

function buildUnionTypes(typesByFile?: Map<string, Map<string, TypeInfo>>): Map<string, TypeInfo> | undefined {
  if (!typesByFile) return undefined;
  const u = new Map<string, TypeInfo>();
  for (const [, m] of typesByFile) for (const [k, v] of m) u.set(k, v);
  return u.size ? u : undefined;
}

function getTypesForFlow(
  flow: Flow,
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
    if (matchesFlowPattern(fileName, flow.name)) {
      return fileTypes;
    }
  }
  return undefined;
}

function createTypeResolver(
  flowSpecificTypes: Map<string, TypeInfo> | undefined,
  unionTypes: Map<string, TypeInfo> | undefined,
) {
  return (
    t: string,
    expected?: 'command' | 'event' | 'state',
    exampleData?: unknown,
  ): { resolvedName: string; typeInfo: TypeInfo | undefined } => {
    // First try flow-specific types, then union/global
    let resolvedName = t;
    let typeInfo: TypeInfo | undefined;

    if (flowSpecificTypes) {
      resolvedName = resolveInferredType(t, flowSpecificTypes, expected, exampleData);
      typeInfo = flowSpecificTypes.get(resolvedName);

      // If not resolved and we have union types, try union types as fallback
      if (resolvedName === 'InferredType' && unionTypes) {
        resolvedName = resolveInferredType(t, unionTypes, expected, exampleData);
        typeInfo = unionTypes.get(resolvedName);
      }
    } else if (unionTypes) {
      resolvedName = resolveInferredType(t, unionTypes, expected, exampleData);
      typeInfo = unionTypes.get(resolvedName);
    }

    return { resolvedName, typeInfo };
  };
}

export const flowsToModel = (flows: Flow[], typesByFile?: Map<string, Map<string, TypeInfo>>): Model => {
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
  const getFlowSpecificTypes = (flow: Flow): Map<string, TypeInfo> | undefined => {
    return getTypesForFlow(flow, typesByFile);
  };

  flows.forEach((flow) => {
    const flowSpecificTypes = getFlowSpecificTypes(flow);
    const resolveTypeAndInfo = createTypeResolver(flowSpecificTypes, unionTypes);
    flow.slices.forEach((slice) => {
      // Extract messages from server specs (Given/When/Then)
      if ('server' in slice && slice.server?.specs !== undefined) {
        const spec = slice.server.specs;
        spec.rules.forEach((rule) => {
          rule.examples.forEach((example) => {
            if (example.given) {
              processGiven(example.given, resolveTypeAndInfo, messages, exampleShapeHints);
            }
            processWhen(example.when, slice, resolveTypeAndInfo, messages, exampleShapeHints);
            processThen(example.then, resolveTypeAndInfo, messages, exampleShapeHints);
          });
        });
      }
      // Integrations: from data & via
      if ('server' in slice && slice.server?.data !== undefined) {
        slice.server.data.forEach((d) => {
          processDataItemIntegrations(d, integrations, messages);
        });
      }
      if ('via' in slice && slice.via) {
        slice.via.forEach((integrationName) => {
          if (!integrations.has(integrationName)) {
            integrations.set(integrationName, {
              name: integrationName,
              description: `${integrationName} integration`,
              source: `@auto-engineer/${integrationName.toLowerCase()}-integration`,
            });
          }
        });
      }
    });
  });
  // Ensure all registered integrations are listed
  for (const integration of registeredIntegrations) {
    const exportName = integrationExportRegistry.getExportNameForIntegration(integration);
    if (!integrations.has(exportName)) {
      integrations.set(exportName, {
        name: exportName,
        description: `${exportName} integration`,
        source: `@auto-engineer/${exportName.toLowerCase()}-integration`,
      });
    }
  }
  // Apply example-driven structural shapes (e.g., Array<Product> -> Array<{ ... }>)
  applyExampleShapeHints(messages, exampleShapeHints);
  // Then inline resolvable identifiers via TypeInfo (if available)
  if (unionTypes) {
    inlineAllMessageFieldTypes(messages, unionTypes);
  }

  return assembleSpecs(flows, Array.from(messages.values()), Array.from(integrations.values()));
};
