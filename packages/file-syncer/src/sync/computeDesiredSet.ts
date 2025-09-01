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

export async function computeDesiredSet(opts: { vfs: NodeFileStore; watchDir: string; projectRoot: string }) {
  const { vfs, watchDir, projectRoot } = opts;
  console.log('[sync] computeDesiredSet: calling getFlows…', { root: watchDir });

  try {
    const res = await getFlows({ vfs, root: watchDir });

    const files = flattenPaths(res.vfsFiles);

    const baseDirs = uniq([projectRoot, ...files.map(dirOf)]);
    const nmRoots = nmRootsForBases(baseDirs);
    console.log('[sync] nm-roots (candidates, no-crawl):', nmRoots.slice(0, 6));

    // externals
    const externalsFromFlows = res.externals ?? [];
    const extraPkgs = await collectBareImportsFromFiles(files, vfs);
    const externals = Array.from(new Set([...externalsFromFlows, ...extraPkgs]));

    // d.ts
    const dtsFromGraph = flattenPaths(res.typings);
    const dtsFromProbe = await probeEntryDtsForPackagesFromRoots(vfs, nmRoots, externals);

    // merge & prefer non-.pnpm & shorter
    const allDts = Array.from(new Set([...dtsFromGraph, ...dtsFromProbe]));
    allDts.sort((a, b) => {
      const pa = a.includes('/.pnpm/') ? 1 : 0;
      const pb = b.includes('/.pnpm/') ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return a.length - b.length;
    });

    // keep only ONE entry per npm package
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

    if (dts.length === 0) console.log(`[sync] ℹ no .d.ts discovered.`);

    // warn outside projectRoot
    const outside = [...files, ...dts].filter((p) => !posix(p).startsWith(posix(projectRoot) + '/'));
    if (outside.length) {
      console.warn(`[sync] ⚠ desired contains files outside projectRoot: ${outside.length}`);
      console.warn('  sample:', outside.slice(0, 5));
    }

    return new Set<string>([...files, ...dts]);
  } catch (err) {
    console.error('[sync] getFlows FAILED:', err);
    return new Set<string>();
  }
}
