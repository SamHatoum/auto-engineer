import { NodeFileStore } from '@auto-engineer/file-store';
import { collectBareImportsFromFiles } from '../discovery/bareImports';
import { nmRootsForBases, probeEntryDtsForPackagesFromRoots } from '../discovery/dts';
import { dirOf, logArray, pkgNameFromPath, scorePathForDedupe, uniq } from '../utils/path';
import createDebug from 'debug';

function flattenPaths(x: string[] | Record<string, string[]> | undefined): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return Object.values(x).flat();
}

const debug = createDebug('auto-engineer:file-syncer:resolve');

/**
 * Stable fallback node_modules roots derived from projectRoot and common monorepo layouts.
 * Ensures deterministic probing even when there are no/very few source files.
 */
function stableCandidateNmRoots(projectRoot: string): string[] {
  const roots = new Set<string>();
  let cur = projectRoot.replace(/\\/g, '/');

  // Ancestors (cap to 8)
  for (let i = 0; i < 8; i++) {
    roots.add(`${cur}/node_modules`);
    const parent = cur.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/';
    if (parent === cur) break;
    cur = parent;
  }
  roots.add(`${projectRoot}/server/node_modules`);
  return [...roots].map((p) => p.replace(/\/+/g, '/'));
}

export async function resolveSyncFileSet(opts: { vfs: NodeFileStore; watchDir: string; projectRoot: string }) {
  const { vfs, watchDir, projectRoot } = opts;
  try {
    // Try to dynamically import flow package - it may not be available
    interface FlowResult {
      vfsFiles?: string[] | Record<string, string[]>;
      externals?: string[];
      typings?: string[] | Record<string, string[]>;
    }

    let flows: FlowResult | null = null;
    try {
      const flowPackage = '@auto-engineer/narrative';
      const flowModule = (await import(flowPackage)) as {
        getFlows: (opts: { vfs: NodeFileStore; root: string }) => Promise<FlowResult>;
      };
      flows = await flowModule.getFlows({ vfs, root: watchDir });
    } catch (e) {
      debug('[sync] @auto-engineer/narrative not available, using fallback mode', e);
    }

    const files = flows !== null ? flattenPaths(flows.vfsFiles) : [];
    const baseDirs = uniq([projectRoot, ...files.map(dirOf)]);
    const dynamicRoots = nmRootsForBases(baseDirs);
    const fallbackRoots = stableCandidateNmRoots(projectRoot);
    const nmRoots = uniq([...dynamicRoots, ...fallbackRoots]);

    // Gather externals from flow graph + bare imports in source files
    const externalsFromFlows = flows?.externals ?? [];
    const extraPkgs = await collectBareImportsFromFiles(files, vfs);
    const externals = Array.from(new Set([...externalsFromFlows, ...extraPkgs]));
    const dtsFromGraph = flows !== null ? flattenPaths(flows.typings) : [];
    const dtsFromProbe = await probeEntryDtsForPackagesFromRoots(vfs, nmRoots, externals);

    // Merge & prefer non-.pnpm & shorter paths for stability
    const allDts = Array.from(new Set([...dtsFromGraph, ...dtsFromProbe]));
    allDts.sort((a, b) => {
      const pa = a.includes('/.pnpm/') ? 1 : 0;
      const pb = b.includes('/.pnpm/') ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return a.length - b.length;
    });

    const dts = dedupeTypeDefinitionsByPackage(allDts);

    logArray('files', files);
    logArray('dts', dts);
    logArray('externals', externals);
    return new Set<string>([...files, ...dts]);
  } catch (err) {
    console.error('[sync] resolveSyncFileSet FAILED:', err);
    return new Set<string>();
  }
}

function dedupeTypeDefinitionsByPackage(allDts: string[]): string[] {
  // Keep only ONE entry .d.ts per npm package (choose best-scoring path)
  const bestByPkg = new Map<string, string>();
  for (const p of allDts) {
    const pkg = pkgNameFromPath(p);
    if (pkg === null) continue;
    const prev = bestByPkg.get(pkg);
    if (prev === undefined || scorePathForDedupe(p) < scorePathForDedupe(prev)) {
      bestByPkg.set(pkg, p);
    }
  }
  return [...bestByPkg.values()];
}
