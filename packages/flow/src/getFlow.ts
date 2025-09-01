import createDebug from 'debug';
import { z } from 'zod';
import { SpecsSchema } from './schema';
import { registry } from './flow-registry';
import { integrationRegistry } from './integration-registry';
import type { Flow } from './index';
import { flowsToSchema } from './flow-to-schema';
import { IFileStore } from '@auto-engineer/file-store';
import { executeAST } from './loader';

const debugIntegrations = createDebug('flow:getFlow:integrations');

export interface GetFlowOptions {
  vfs: IFileStore;
  filePath: string;
  importMap?: Record<string, unknown>;
}

export const getFlow = async (opts: GetFlowOptions) => {
  const { vfs, filePath, importMap = {} } = opts;

  registry.clearAll();
  integrationRegistry.clear();
  await executeAST([filePath], vfs, importMap);

  const flows: Flow[] = registry.getAllFlows();
  const integrations = integrationRegistry.getAll();
  debugIntegrations(`[getFlow] Found ${flows.length} flows and ${integrations.length} integrations`);

  return {
    flows,
    toSchema: (): z.infer<typeof SpecsSchema> => flowsToSchema(flows),
  };
};
