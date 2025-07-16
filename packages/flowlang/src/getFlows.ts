import fg from 'fast-glob';
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';
import { registry } from './flow-registry';
import { FlowSchema } from './schema';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

const flowsToSchema = (flows: unknown): Record<string, unknown> => {
  const serialized = JSON.stringify(flows, (_key, val) => {
    if (val instanceof Date) {
      return val.toISOString();
    }
    return val as unknown;
  });
  return JSON.parse(serialized) as Record<string, unknown>;
};

export const getFlows = async () => {
  registry.clearAll();
  const files = await fg('**/*.flow.ts', {
    cwd: packageRoot,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
  });

  console.log('[getFlows] searching in:', packageRoot);
  console.log('[getFlows] matched files:', files);

  await Promise.all(files.map((file) => import(pathToFileURL(file).href)));

  const flows = registry.getAllFlows();

  return {
    flows,
    toSchema: (): Record<string, unknown> => flowsToSchema(flows),
  };
};

export const getFlow = async (filePath: string) => {
  registry.clearAll();
  
  const absolutePath = resolve(filePath);

  await import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`);

  const flows = registry.getAllFlows();

  return {
    flows,
    toSchema: (): Record<string, unknown> => flowsToSchema(flows),
  };
};

export const convertFlowToJson = async (filePath: string, outputPath?: string): Promise<string> => {
  const result = await getFlow(filePath);
  const schema = result.toSchema();
  
  // Validate against FlowSchema array
  const FlowArraySchema = z.array(FlowSchema);
  try {
    FlowArraySchema.parse(schema);
    console.error('✓ Schema validation passed');
  } catch (error) {
    console.error('⚠ Schema validation failed:', error instanceof z.ZodError ? error.format() : error);
  }
  
  const json = JSON.stringify(schema, null, 2);
  
  if (outputPath !== undefined && outputPath !== null && outputPath.length > 0) {
    writeFileSync(outputPath, json);
    console.log(`Flow converted to JSON and saved to: ${outputPath}`);
  }
  
  return json;
};
