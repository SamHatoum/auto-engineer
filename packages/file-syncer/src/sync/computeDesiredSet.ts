import { getFlows } from '@auto-engineer/flow';
import { NodeFileStore } from '@auto-engineer/file-store';
import { collectBareImportsFromFiles } from '../discovery/bareImports';
import { nmRootsForBases, probeEntryDtsForPackagesFromRoots } from '../discovery/dts';
import { dirOf, logArray, posix, pkgNameFromPath, scorePathForDedupe, uniq } from '../utils/path';

function flattenPaths(x: string[] | Record<string, string[]> | undefined): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return Object.values(x).flat();
}

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

  // Common monorepo siblings
  roots.add(`${projectRoot}/server/node_modules`);
  roots.add(`${projectRoot}/packages/node_modules`);
  roots.add(`${projectRoot}/apps/node_modules`);

  return [...roots].map((p) => p.replace(/\/+/g, '/'));
}

export async function computeDesiredSet(opts: { vfs: NodeFileStore; watchDir: string; projectRoot: string }) {
  const { vfs, watchDir, projectRoot } = opts;
  console.log('[sync] computeDesiredSet: calling getFlows…', { root: watchDir });

  try {
    const res = await getFlows({ vfs, root: watchDir });

    const files = flattenPaths(res.vfsFiles);

    // --- Build nm roots with a HYBRID strategy: dynamic (from files) + stable (from projectRoot) ---
    const baseDirs = uniq([projectRoot, ...files.map(dirOf)]);
    const dynamicRoots = nmRootsForBases(baseDirs);
    const fallbackRoots = stableCandidateNmRoots(projectRoot);
    const nmRoots = uniq([...dynamicRoots, ...fallbackRoots]);
    console.log('[sync] nm-roots (candidates, no-crawl):', nmRoots.slice(0, 8));

    // --- External packages: from flow graph + harvested bare imports in synced files ---
    const externalsFromFlows = res.externals ?? [];
    const extraPkgs = await collectBareImportsFromFiles(files, vfs);
    const externals = Array.from(new Set([...externalsFromFlows, ...extraPkgs]));

    // --- Typings: from graph + probe per external across candidate nm roots ---
    const dtsFromGraph = flattenPaths(res.typings);
    const dtsFromProbe = await probeEntryDtsForPackagesFromRoots(vfs, nmRoots, externals);

    // Merge & prefer non-.pnpm & shorter paths for stability
    const allDts = Array.from(new Set([...dtsFromGraph, ...dtsFromProbe]));
    allDts.sort((a, b) => {
      const pa = a.includes('/.pnpm/') ? 1 : 0;
      const pb = b.includes('/.pnpm/') ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return a.length - b.length;
    });

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
    const dts = [...bestByPkg.values()];

    console.log(
      `[sync] getFlows -> flows=${res.flows.length} files=${files.length} dts=${dts.length} externals=${externals.length}`,
    );
    logArray('files', files);
    logArray('dts', dts);
    logArray('externals', externals);

    if (dts.length === 0) console.log('[sync] ℹ no .d.ts discovered.');

    // Warn if anything lies outside projectRoot (wire path becomes /../…)
    const outside = [...files, ...dts].filter((p) => !posix(p).startsWith(posix(projectRoot) + '/'));
    if (outside.length) {
      console.warn(`[sync] ⚠ desired contains files outside projectRoot: ${outside.length}`);
      console.warn('  sample:', outside.slice(0, 5));
    }

    // Return only files (source/integration) + selected .d.ts — no directories.
    return new Set<string>([...files, ...dts]);
  } catch (err) {
    console.error('[sync] getFlows FAILED:', err);
    return new Set<string>();
  }
}
