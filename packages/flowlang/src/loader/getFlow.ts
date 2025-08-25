import createDebug from 'debug';
import { z } from 'zod';
import { SpecsSchema } from '../schema';
import { registry } from '../flow-registry';
import { messageRegistry } from '../message-registry';
import { globalIntegrationRegistry } from '../integration-registry';
import type { VfsLike } from '../vfs';
import type { Flow } from '../index';
import type { Integration } from '../types';
import { flowsToSchema } from './flow-to-schema';
import { loadEsbuild, vfsPlugin, importMapPlugin, execIndexModule } from './shared-build';

const debugIntegrations = createDebug('flowlang:getFlow:integrations');

export interface GetFlowOptions {
  vfs: VfsLike;
  filePath: string; // absolute (POSIX) path within the VFS
  importMap?: Record<string, unknown>;
  esbuildWasmURL?: string;
}

export const getFlow = async (opts: GetFlowOptions) => {
  const { vfs, filePath, importMap = {}, esbuildWasmURL } = opts;

  registry.clearAll();
  messageRegistry.messages.clear();
  globalIntegrationRegistry.clear();

  const esbuild = await loadEsbuild(esbuildWasmURL);
  const plugins = [vfsPlugin(vfs), importMapPlugin(importMap)];

  const indexSource = `export * from "${filePath.replace(/"/g, '\\"')}";`;
  const ns = await execIndexModule(esbuild, vfs, indexSource, '/virtual-single-index.ts', plugins);

  if (ns !== null && typeof ns === 'object') {
    const nsObj = ns as Record<string, unknown>;
    for (const exportValue of Object.values(nsObj)) {
      if (
        exportValue !== null &&
        typeof exportValue === 'object' &&
        '__brand' in exportValue &&
        (exportValue as { __brand?: string }).__brand === 'Integration'
      ) {
        // register into the global registry (flowsToSchema reads from it)
        globalIntegrationRegistry.register(exportValue as unknown as Integration);
      }
    }
  }

  const flows: Flow[] = registry.getAllFlows();
  const integrations = globalIntegrationRegistry.getAll();
  debugIntegrations(`[getFlow] Found ${flows.length} flows and ${integrations.length} integrations`);

  return {
    flows,
    toSchema: (): z.infer<typeof SpecsSchema> => flowsToSchema(flows),
  };
};
