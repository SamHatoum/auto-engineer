import { z } from 'zod';
import { SpecsSchema } from '../schema';
import type { VfsLike } from '../vfs';
import { getFlow, GetFlowOptions } from './getFlow';

export interface ConvertFlowToJsonOptions extends Omit<GetFlowOptions, 'filePath'> {
  vfs: VfsLike;
  filePath: string;
  outputPath?: string;
}

export const convertFlowToJson = async (opts: ConvertFlowToJsonOptions): Promise<string> => {
  const { vfs, filePath, outputPath, importMap, esbuildWasmURL } = opts;
  const result = await getFlow({ vfs, filePath, importMap, esbuildWasmURL });
  const schema = result.toSchema();
  try {
    SpecsSchema.parse(schema);
  } catch (error) {
    console.error('Schema validation failed:', error instanceof z.ZodError ? error.format() : error);
  }
  const json = JSON.stringify(schema, null, 2);
  if (outputPath != null) {
    await vfs.writeFile(outputPath, json, 'utf8');
  }

  return json;
};
