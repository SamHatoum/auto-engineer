import createDebug from 'debug';
import { z } from 'zod';
import { SpecsSchema } from './schema';
import { registry } from './flow-registry';
import type { Flow } from './index';
import { flowsToSchema } from './flow-to-schema';
import type { IFileStore } from '@auto-engineer/file-store';
import { executeAST } from './loader';

const debug = createDebug('flow:getFlows');

const toPosix = (p: string) => p.replace(/\\/g, '/');

// *.flow.* and *.integration.* (ts|tsx|js|jsx|mjs|cjs) — exclude .d.ts
const DEFAULT_PATTERN = /\.(flow|integration)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const DEFAULT_IGNORE_DIRS = /(?:^|\/)(?:node_modules|dist|\.turbo|\.git)(?:\/|$)/;
const DTS_PATTERN = /\.d\.ts$/;

export interface GetFlowsOptions {
  vfs: IFileStore;
  /** Root directory inside the VFS to search. Default: "/" */
  root?: string;
  pattern?: RegExp;
  importMap?: Record<string, unknown>;
}

async function discoverFiles(vfs: IFileStore, root: string, pattern: RegExp): Promise<string[]> {
  const entries = await vfs.listTree(root);
  const files = entries
    .filter((e) => e.type === 'file')
    .map((e) => toPosix(e.path))
    .filter((p) => !DEFAULT_IGNORE_DIRS.test(p))
    .filter((p) => !DTS_PATTERN.test(p))
    .filter((p) => pattern.test(p))
    .sort();

  debug('discover: root=%s pattern=%s matched=%d', root, String(pattern), files.length);
  if (files.length <= 20) debug('discover: files=%o', files);
  else debug('discover: first5=%o last5=%o', files.slice(0, 5), files.slice(-5));
  return files;
}

function logFlowResults(flows: Flow[]): void {
  debug('flows after load = %d', flows.length);
  if (flows.length <= 20) {
    debug(
      'flow names: %o',
      flows.map((f) => f.name),
    );
  }
}

export const getFlows = async (opts: GetFlowsOptions) => {
  const { vfs, root, pattern = DEFAULT_PATTERN, importMap = {} } = opts;

  if (root == null) {
    throw new Error('getFlows: root option is required');
  }

  const normRoot = toPosix(root);

  const files = await discoverFiles(vfs, normRoot, pattern);
  if (files.length === 0) {
    throw new Error(`getFlows: no candidate files found. root=${normRoot} pattern=${String(pattern)}`);
  }

  await executeAST(files, vfs, importMap ?? {});

  const flows: Flow[] = registry.getAllFlows();
  logFlowResults(flows);

  return {
    flows,
    toSchema: (): z.infer<typeof SpecsSchema> => flowsToSchema(flows),
  };
};
