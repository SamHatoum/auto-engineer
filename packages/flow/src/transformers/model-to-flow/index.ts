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
 * @param opts Configuration options for import paths
 * @returns Promise resolving to formatted TypeScript code string
 */
export async function modelToFlow(
  model: Model,
  opts: { flowImport: string; integrationImport: string },
): Promise<string> {
  const rawCode = generateTypeScriptCode(model, opts);
  return await formatWithPrettier(rawCode);
}
