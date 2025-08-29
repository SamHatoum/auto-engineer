import { z } from 'zod';
import { SpecsSchema } from '../schema';
import { getFlow, GetFlowOptions } from './getFlow';
import { IFileStore } from '@auto-engineer/file-store';
import createDebug from 'debug';

const debug = createDebug('flowlang:convertFlowToJson');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '6';
} // cyan

export interface ConvertFlowToJsonOptions extends Omit<GetFlowOptions, 'filePath'> {
  vfs: IFileStore;
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
    debug('Schema validation failed: %O', error instanceof z.ZodError ? error.format() : error);
  }
  const json = JSON.stringify(schema, null, 2);
  if (outputPath != null) {
    const te = new TextEncoder();
    await vfs.write(outputPath, te.encode(json));
  }

  return json;
};
