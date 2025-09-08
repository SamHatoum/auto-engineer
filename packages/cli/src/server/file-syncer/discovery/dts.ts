import { NodeFileStore } from '@auto-engineer/file-store';
import createDebug from 'debug';
import { posix } from '../utils/path';

const debug = createDebug('auto-engineer:file-syncer:dts');

export async function readJsonIfExists(vfs: NodeFileStore, p: string): Promise<Record<string, unknown> | null> {
  try {
    const buf = await vfs.read(p);
    if (!buf) return null;
    return JSON.parse(new TextDecoder().decode(buf)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function exists(vfs: NodeFileStore, p: string): Promise<boolean> {
  try {
    const buf = await vfs.read(p);
    return !!buf;
  } catch {
    return false;
  }
}

export function typesAlias(pkg: string): string {
  if (pkg.startsWith('@')) {
    const [scope, name] = pkg.split('/');
    return `@types/${scope.slice(1)}__${name}`;
  }
  return `@types/${pkg}`;
}

/** From a list of “base directories”, add each ancestor’s node_modules*/
export function nmRootsForBases(bases: string[], maxUp = 8): string[] {
  const roots = new Set<string>();
  for (const base of bases) {
    let cur = base.replace(/\\/g, '/');
    for (let i = 0; i < maxUp; i++) {
      roots.add(`${cur}/node_modules`);
      const parent = cur.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/';
      if (parent === cur) break;
      cur = parent;
    }
  }
  return [...roots].map((p) => p.replace(/\/+/g, '/'));
}

/** Probe a single package for its entry .d.ts inside a given nm root. */
export async function probeEntryDtsInRoot(vfs: NodeFileStore, nmRoot: string, pkg: string): Promise<string | null> {
  const pkgDir = `${nmRoot}/${pkg}`.replace(/\/+/g, '/');

  // package.json types/typings
  const pj = await readJsonIfExists(vfs, `${pkgDir}/package.json`);
  if (pj && (typeof pj.types === 'string' || typeof pj.typings === 'string')) {
    const rel = String(pj.types ?? pj.typings);
    const abs = posix(`${pkgDir}/${rel}`.replace(/\/+/g, '/'));
    if (await exists(vfs, abs)) return abs;
  }

  // index.d.ts at root
  const idx = posix(`${pkgDir}/index.d.ts`);
  if (await exists(vfs, idx)) return idx;

  // dist/index.d.ts (very common)
  const distIdx = posix(`${pkgDir}/dist/index.d.ts`);
  if (await exists(vfs, distIdx)) return distIdx;

  return null;
}

/** For each external pkg, choose at most ONE entry d.ts by scanning across provided nm roots. */
export async function probeEntryDtsForPackagesFromRoots(
  vfs: NodeFileStore,
  nmRoots: string[],
  pkgs: string[],
): Promise<string[]> {
  function scorePath(p: string): number {
    // lower score = better
    let s = 0;
    const pathPosix = p.replace(/\\/g, '/');
    if (pathPosix.includes('/server/node_modules/')) s -= 10;
    if (!pathPosix.includes('/.pnpm/')) s -= 3;
    if (pathPosix.includes('/node_modules/')) s -= 1;
    s += pathPosix.length / 1000;
    return s;
  }

  const out = new Set<string>();

  for (const pkg of pkgs) {
    const candidates: string[] = [];

    for (const nm of nmRoots) {
      const hit = await probeEntryDtsInRoot(vfs, nm, pkg);
      if (hit !== null) candidates.push(hit);
    }

    if (candidates.length === 0) {
      const alias = typesAlias(pkg);
      for (const nm of nmRoots) {
        const hit = await probeEntryDtsInRoot(vfs, nm, alias);
        if (hit !== null) candidates.push(hit);
      }
    }

    if (candidates.length) {
      candidates.sort((a, b) => scorePath(a) - scorePath(b));
      out.add(candidates[0]);
    } else {
      debug('dts-probe: ⚠ no entry .d.ts found for %s', pkg);
    }
  }

  return [...out];
}
