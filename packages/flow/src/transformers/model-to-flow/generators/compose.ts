import ts from 'typescript';
import { buildImports, ALL_FLOW_FUNCTION_NAMES } from './imports';
import { buildTypeAliases } from './types';
import { buildFlowStatements } from './flow';
import { extractTypeIntegrationNames } from '../utils/integration-extractor';
import { integrationNameToPascalCase } from '../utils/strings';
import { analyzeCodeUsage } from '../analysis/usage';
import { Model } from '../../../index';

export function generateTypeScriptCode(schema: Model, opts: { flowImport: string; integrationImport: string }): string {
  const f = ts.factory;
  const messages = schema.messages ?? [];
  const flows = schema.flows ?? [];
  const integrations = schema.integrations ?? [];

  const allTypeIntegrationNames = extractTypeIntegrationNames(flows);
  const allValueIntegrationNames = integrations.map((integration) => integrationNameToPascalCase(integration.name));

  const allFlowFunctionNames = [...ALL_FLOW_FUNCTION_NAMES];
  const preliminaryStatements = buildStatements(
    ts,
    opts,
    messages,
    allTypeIntegrationNames,
    allValueIntegrationNames,
    allFlowFunctionNames,
    flows,
  );
  const preliminaryFile = f.createSourceFile(
    preliminaryStatements,
    f.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None,
  );
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
    omitTrailingSemicolon: false,
  });
  const preliminaryCode = printer.printFile(preliminaryFile);

  // Analyze which types and integrations are actually used
  const allTypeNames = messages.map((msg) => msg.name);
  const usageAnalysis = analyzeCodeUsage(
    preliminaryCode,
    allTypeNames,
    allTypeIntegrationNames,
    allValueIntegrationNames,
    allFlowFunctionNames,
  );

  // Filter to only used types and integrations
  // Type integrations should be filtered based on usedTypes, not usedIntegrations
  const usedTypeIntegrationNames = allTypeIntegrationNames.filter((name) => usageAnalysis.usedTypes.has(name));
  const usedValueIntegrationNames = allValueIntegrationNames.filter((name) => usageAnalysis.usedIntegrations.has(name));
  const usedFlowFunctionNames = Array.from(usageAnalysis.usedFlowFunctions);

  // Include messages that are either:
  // 1. Used in flows, or
  // 2. Present in model but not referenced in flows (standalone message definitions)
  // Exclude types that are imported from integrations - don't generate local type definitions for them
  const usedMessages = messages.filter((msg) => {
    const isImportedFromIntegration = usedTypeIntegrationNames.includes(msg.name);
    const isUsedInFlow = usageAnalysis.usedTypes.has(msg.name);
    const hasEmptyFlowSlices = flows.length === 0 || flows.every((flow) => flow.slices.length === 0);

    // Don't generate local definitions for types imported from integrations
    if (isImportedFromIntegration) {
      return false;
    }

    return isUsedInFlow || hasEmptyFlowSlices;
  });

  const statements = buildStatements(
    ts,
    opts,
    usedMessages,
    usedTypeIntegrationNames,
    usedValueIntegrationNames,
    usedFlowFunctionNames,
    flows,
  );

  // Create source file and print
  const file = f.createSourceFile(statements, f.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);

  return printer.printFile(file);
}

function buildStatements(
  ts: typeof import('typescript'),
  opts: { flowImport: string; integrationImport: string },
  messages: Model['messages'],
  typeIntegrationNames: string[],
  valueIntegrationNames: string[],
  usedFlowFunctionNames: string[],
  flows: Model['flows'],
): ts.Statement[] {
  const statements: ts.Statement[] = [];

  // imports
  const imports = buildImports(ts, opts, messages, typeIntegrationNames, valueIntegrationNames, usedFlowFunctionNames);
  if (imports.importFlowValues !== null) statements.push(imports.importFlowValues);
  if (imports.importFlowTypes !== null) statements.push(imports.importFlowTypes);
  if (imports.importIntegrationValues !== null) statements.push(imports.importIntegrationValues);
  if (imports.importIntegrationTypes !== null) statements.push(imports.importIntegrationTypes);

  // Type definitions
  const adaptedMessages = messages.map((msg) => ({
    type: msg.type,
    name: msg.name,
    fields: msg.fields.map((field) => ({
      name: field.name,
      type: field.type,
      required: field.required,
    })),
  }));
  statements.push(...buildTypeAliases(ts, adaptedMessages));
  for (const flow of flows) {
    statements.push(...buildFlowStatements(ts, flow as unknown as Parameters<typeof buildFlowStatements>[1], messages));
  }

  return statements;
}
