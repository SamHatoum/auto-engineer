import { z } from 'zod';
import { SpecsSchema } from '../schema';
import { getFlow, GetFlowOptions } from './getFlow';
import { FileStore } from '../fs';

export interface ConvertFlowToJsonOptions extends Omit<GetFlowOptions, 'filePath'> {
  vfs: FileStore;
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
    const te = new TextEncoder();
    await vfs.write(outputPath, te.encode(json));
  }

  return json;
};
