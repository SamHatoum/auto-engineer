import { generateTypeScriptCode } from './generators/compose';
import { formatWithPrettier } from './formatting/prettier';
import { Model } from '../../index';

/**
 * Converts a schema specification to TypeScript flow DSL code.
 *
 * This function takes a complete schema specification and generates the corresponding
 * TypeScript code using the flow DSL, including imports, type definitions, builders,
 * and flow specifications.
 *
 * @param model The complete schema specification conforming to SpecsSchema
 * @returns Promise resolving to formatted TypeScript code string
 */
export async function modelToFlow(model: Model): Promise<string> {
  const flowImport = '@auto-engineer/flow';
  const integrationImport = extractIntegrationImportFromModel(model);
  const rawCode = generateTypeScriptCode(model, { flowImport, integrationImport });
  return await formatWithPrettier(rawCode);
}

function extractIntegrationImportFromModel(model: Model): string {
  if (model.integrations && model.integrations.length > 0) {
    return model.integrations[0].source;
  }
  return '';
}
