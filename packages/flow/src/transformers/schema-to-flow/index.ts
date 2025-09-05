import ts from 'typescript';
import type { z } from 'zod';
import { SpecsSchema } from '../../schema';

import { buildImports } from './generators/imports';
import { buildTypeAliases } from './generators/types';
import { buildCreateBuildersDecl } from './generators/builders';
import { buildFlowStatements } from './generators/flow';
import { extractTypeIntegrationNames } from './utils/integration-extractor';
import { integrationNameToPascalCase } from './utils/strings';

type SchemaData = z.infer<typeof SpecsSchema>;

/**
 * Converts a schema specification to TypeScript flow DSL code.
 *
 * This function takes a complete schema specification and generates the corresponding
 * TypeScript code using the flow DSL, including imports, type definitions, builders,
 * and flow specifications.
 *
 * @param schema The complete schema specification conforming to SpecsSchema
 * @param opts Configuration options for import paths
 * @returns Promise resolving to formatted TypeScript code string
 */
export async function schemaToFlow(
  schema: SchemaData,
  opts: { flowImport: string; integrationImport: string },
): Promise<string> {
  const f = ts.factory;

  const messages = schema.messages ?? [];
  const flows = schema.flows ?? [];
  const integrations = schema.integrations ?? [];

  const eventNames = messages.filter((m) => m.type === 'event').map((m) => m.name);
  const commandNames = messages.filter((m) => m.type === 'command').map((m) => m.name);
  const stateNames = messages.filter((m) => m.type === 'state').map((m) => m.name);

  const typeIntegrationNames = extractTypeIntegrationNames(flows);
  const valueIntegrationNames = integrations.map((integration) => integrationNameToPascalCase(integration.name));

  const statements: ts.Statement[] = [];

  const imports = buildImports(
    ts,
    { flowImport: opts.flowImport, integrationImport: opts.integrationImport },
    messages,
    typeIntegrationNames,
    valueIntegrationNames,
  );
  statements.push(imports.importFlowValues);
  if (imports.importFlowTypes !== null) statements.push(imports.importFlowTypes);
  if (imports.importIntegrationValues !== null) statements.push(imports.importIntegrationValues);
  if (imports.importIntegrationTypes !== null) statements.push(imports.importIntegrationTypes);

  const eventMessages = messages.filter((m) => m.type === 'event');
  const commandMessages = messages.filter((m) => m.type === 'command');
  const stateMessages = messages.filter((m) => m.type === 'state');
  const orderedMessages = [...eventMessages, ...commandMessages, ...stateMessages];
  // Convert schema messages to the format expected by buildTypeAliases
  const adaptedMessages = orderedMessages.map((msg) => ({
    type: msg.type,
    name: msg.name,
    fields: msg.fields.map((field) => ({
      name: field.name,
      type: field.type,
      required: field.required,
    })),
  }));
  statements.push(...buildTypeAliases(ts, adaptedMessages));

  // Generate createBuilders declaration
  statements.push(buildCreateBuildersDecl(ts, eventNames, commandNames, stateNames));

  // Generate flow statements (currently generates first flow only)
  if (flows.length > 0) {
    statements.push(...buildFlowStatements(ts, flows[0] as unknown as Parameters<typeof buildFlowStatements>[1]));
  }

  // Create source file and print
  const file = f.createSourceFile(statements, f.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
    omitTrailingSemicolon: false,
  });
  const rawCode = printer.printFile(file);

  // Format output with Prettier
  try {
    const prettier = await import('prettier');
    return await prettier.format(rawCode, {
      parser: 'typescript',
      singleQuote: true,
      semi: true,
      trailingComma: 'all',
      printWidth: 120,
    });
  } catch (error) {
    console.warn('Prettier formatting failed, returning unformatted code:', error);
    return rawCode;
  }
}
