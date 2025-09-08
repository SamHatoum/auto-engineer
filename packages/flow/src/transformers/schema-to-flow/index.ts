import type { z } from 'zod';
import { SpecsSchema } from '../../schema';
import { generateTypeScriptCode } from './generators/compose';
import { formatWithPrettier } from './formatting/prettier';

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
  const rawCode = generateTypeScriptCode(schema, opts);
  return await formatWithPrettier(rawCode);
}
