import ts from 'typescript';
import type { z } from 'zod';
import { SpecsSchema } from '../../../schema';
import { buildImports } from './imports';
import { buildTypeAliases } from './types';
import { buildFlowStatements } from './flow';
import { extractTypeIntegrationNames } from '../utils/integration-extractor';
import { integrationNameToPascalCase } from '../utils/strings';
import { analyzeCodeUsage } from '../analysis/usage';

type SchemaData = z.infer<typeof SpecsSchema>;

export function generateTypeScriptCode(
  schema: SchemaData,
  opts: { flowImport: string; integrationImport: string },
): string {
  const f = ts.factory;
  const messages = schema.messages ?? [];
  const flows = schema.flows ?? [];
  const integrations = schema.integrations ?? [];

  // Generate a preliminary version of the code to analyze which types and integrations are used
  const allTypeIntegrationNames = extractTypeIntegrationNames(flows);
  const allValueIntegrationNames = integrations.map((integration) => integrationNameToPascalCase(integration.name));

  // Generate preliminary code with all imports to analyze
  const preliminaryStatements = buildStatements(
    ts,
    opts,
    messages,
    allTypeIntegrationNames,
    allValueIntegrationNames,
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
  );

  // Filter to only used types and integrations
  // Type integrations should be filtered based on usedTypes, not usedIntegrations
  const usedTypeIntegrationNames = allTypeIntegrationNames.filter((name) => usageAnalysis.usedTypes.has(name));
  const usedValueIntegrationNames = allValueIntegrationNames.filter((name) => usageAnalysis.usedIntegrations.has(name));
  // Exclude types that are imported from integrations - don't generate local type definitions for them
  const usedMessages = messages.filter(
    (msg) => usageAnalysis.usedTypes.has(msg.name) && !usedTypeIntegrationNames.includes(msg.name),
  );

  // Generate final statements with filtered imports
  const statements = buildStatements(
    ts,
    opts,
    usedMessages,
    usedTypeIntegrationNames,
    usedValueIntegrationNames,
    flows,
  );

  // Create source file and print
  const file = f.createSourceFile(statements, f.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);

  return printer.printFile(file);
}

function buildStatements(
  ts: typeof import('typescript'),
  opts: { flowImport: string; integrationImport: string },
  messages: SchemaData['messages'],
  typeIntegrationNames: string[],
  valueIntegrationNames: string[],
  flows: SchemaData['flows'],
): ts.Statement[] {
  const statements: ts.Statement[] = [];

  // Add imports
  const imports = buildImports(ts, opts, messages, typeIntegrationNames, valueIntegrationNames);
  statements.push(imports.importFlowValues);
  if (imports.importFlowTypes !== null) statements.push(imports.importFlowTypes);
  if (imports.importIntegrationValues !== null) statements.push(imports.importIntegrationValues);
  if (imports.importIntegrationTypes !== null) statements.push(imports.importIntegrationTypes);

  // Add type definitions
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

  // Add flows

  if (flows.length > 0) {
    statements.push(...buildFlowStatements(ts, flows[0] as unknown as Parameters<typeof buildFlowStatements>[1]));
  }

  return statements;
}
