import path from 'path';

export const posix = (p: string) => p.split(path.sep).join('/');

export function toWirePath(abs: string, projectRoot: string) {
  const rel = path.relative(projectRoot, abs);
  const wire = ('/' + rel).split(path.sep).join('/');
  if (rel.startsWith('..')) {
    console.warn(`[sync] ⚠ toWirePath: abs is outside projectRoot. abs=${abs}`);
  }
  return wire;
}

export function sample<T>(arr: T[], n = 5) {
  return arr.slice(0, n);
}

export function logArray(label: string, arr: string[], n = 5) {
  console.log(`[sync] ${label}: count=${arr.length}`);
  if (arr.length) console.log(`  ${label} sample:`, sample(arr, n));
}

export function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function dirOf(p: string): string {
  const norm = p.replace(/\\/g, '/');
  return norm.slice(0, norm.lastIndexOf('/')) || '/';
}

// Extract npm package from a node_modules path
export function pkgNameFromPath(p: string): string | null {
  const m = p.replace(/\\/g, '/').match(/\/node_modules\/((@[^/]+\/)?[^/]+)/);
  return m ? m[1] : null;
}

// Prefer server/node_modules, then plain node_modules, avoid .pnpm, and shorter paths
export function scorePathForDedupe(p: string): number {
  let s = 0;
  const pathPosix = p.replace(/\\/g, '/');
  if (pathPosix.includes('/server/node_modules/')) s -= 10;
  if (!pathPosix.includes('/.pnpm/')) s -= 3;
  if (pathPosix.includes('/node_modules/')) s -= 1;
  s += pathPosix.length / 1000;
  return s;
}
