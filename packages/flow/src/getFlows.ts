import createDebug from 'debug';
import { registry } from './flow-registry';
import type { Flow, Model } from './index';
import { flowsToModel } from './transformers/flow-to-model';
import type { IFileStore } from '@auto-engineer/file-store';
import { executeAST } from './loader';

const dirnamePosix = (p: string) => {
  const s = p.replace(/\/+$/, '');
  const i = s.lastIndexOf('/');
  return i > 0 ? s.slice(0, i) : '/';
};

const debug = createDebug('flow:getFlows');

const toPosix = (p: string) => p.replace(/\\/g, '/');
const DEFAULT_PATTERN = /\.(flow|integration)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const DEFAULT_IGNORE_DIRS = /(?:^|\/)(?:node_modules|dist|\.turbo|\.git)(?:\/|$)/;
const DTS_PATTERN = /\.d\.ts$/;

export interface GetFlowsOptions {
  vfs: IFileStore;
  root: string;
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
  return files;
}

export const getFlows = async (
  opts: GetFlowsOptions,
): Promise<{
  flows: Flow[];
  vfsFiles: string[];
  externals: string[];
  typings: Record<string, string[]>;
  typeMap: Map<string, string>;
  typesByFile: Map<string, Map<string, unknown>>;
  givenTypesByFile: Map<string, unknown[]>;
  toModel: () => Model;
}> => {
  const { vfs, root, pattern = DEFAULT_PATTERN, importMap = {} } = opts;
  const normRoot = toPosix(root);
  const projectRoot = dirnamePosix(normRoot);

  const files = await discoverFiles(vfs, normRoot, pattern);

  if (files.length === 0) {
    throw new Error(`getFlows: no candidate files found. root=${normRoot} pattern=${String(pattern)}`);
  }

  const exec = await executeAST(files, vfs, importMap ?? {}, projectRoot);

  const flows: Flow[] = registry.getAllFlows();
  return {
    flows,
    vfsFiles: exec.vfsFiles, // absolute posix paths of all VFS modules in the graph
    externals: exec.externals, // external specifiers used
    typings: exec.typings, // { pkgName: [abs d.ts paths] }
    typeMap: exec.typeMap, // mapping from TypeScript type names to string literals
    typesByFile: exec.typesByFile, // mapping from file path to type definitions in that file
    givenTypesByFile: exec.givenTypesByFile, // mapping from file path to given type info
    toModel: (): Model => flowsToModel(flows, exec.typesByFile),
  };
};
