import createDebug from 'debug';
import type { Graph } from './types';
import type { IFileStore } from '@auto-engineer/file-store';
import { parseImports, patchImportMeta, transpileToCjs } from './ts-utils';
import { toPosix } from './fs-path';
import { resolveSpecifier } from './resolver';

const debug = createDebug('flow:graph');

export async function buildGraph(
  entryFiles: string[],
  vfs: IFileStore,
  importMap: Record<string, unknown>,
): Promise<Graph> {
  const ts = await import('typescript');

  const graph: Graph = new Map();
  const visited = new Set<string>();

  async function buildRec(absPath: string): Promise<void> {
    const path = toPosix(absPath);
    if (visited.has(path)) return;
    visited.add(path);

    const buf = await vfs.read(path);
    if (!buf) {
      debug('missing in VFS: %s', path);
      return;
    }

    let source = new TextDecoder().decode(buf);
    source = patchImportMeta(source, path);

    const imports = parseImports(ts, path, source);
    const resolved = new Map<string, import('./types').Resolved>();
    for (const spec of imports) {
      const r = await resolveSpecifier(vfs, spec, path, importMap);
      resolved.set(spec, r);
      if (r.kind === 'vfs') {
        await buildRec(r.path);
      }
    }

    const js = transpileToCjs(ts, path, source);
    graph.set(path, { js, imports, resolved });
  }

  for (const entry of entryFiles) {
    await buildRec(toPosix(entry));
  }

  debug('graph built: modules=%d', graph.size);
  return graph;
}
