import path from 'path';
import createDebug from 'debug';

const debug = createDebug('cli:file-syncer:path');

export const posix = (p: string) => p.split(path.sep).join('/');

export function toWirePath(abs: string, projectRoot: string) {
  const rel = path.relative(projectRoot, abs);
  if (rel.startsWith('..')) {
    debug('toWirePath: abs is outside projectRoot. abs=%s', abs);
    const nodeModulesMatch = abs.match(/.*\/node_modules\/(.*)/);
    if (nodeModulesMatch) {
      // Remap to virtual /.external/node_modules/ path to avoid traversal error
      let modulePath = nodeModulesMatch[1];
      // Normalize path by removing redundant ./  segments
      modulePath = modulePath.replace(/\/\.\//g, '/').replace(/^\.\//, '');

      const wire = `/.external/node_modules/${modulePath}`.split(path.sep).join('/');
      cacheWireMapping(wire, abs); // Cache for reverse mapping
      return wire;
    }

    // For other external paths, use a hash to create a unique virtual path
    const hash = Buffer.from(abs)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);
    const fileName = path.basename(abs);
    const wire = `/.external/other/${hash}_${fileName}`;
    debug('Remapped external path to: %s', wire);
    cacheWireMapping(wire, abs); // Cache for reverse mapping
    return wire;
  }

  // Normal case: path is within project root
  const wire = ('/' + rel).split(path.sep).join('/');
  return wire;
}

export function sample<T>(arr: T[], n = 5) {
  return arr.slice(0, n);
}

export function logArray(label: string, arr: string[], _n = 5) {
  if (arr.length === 0) {
    debug(`${label}: (empty)`);
    return;
  }
  debug(`${label}: ${arr.length} items`);
  const sampled = sample(arr, _n);
  for (let i = 0; i < sampled.length; i++) {
    debug(`  ${i + 1}. ${sampled[i]}`);
  }
  if (arr.length > _n) {
    debug(`  ... and ${arr.length - _n} more`);
  }
}

export function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

// Map to store reverse mappings for two-way sync
// This needs to be persistent across connections for reliable sync
const wirePathToAbsCache = new Map<string, string>();

// Clear and rebuild the cache (used when new connections are established)
export function rebuildWirePathCache(files: Array<{ abs: string; projectRoot: string }>): void {
  wirePathToAbsCache.clear();
  for (const { abs, projectRoot } of files) {
    toWirePath(abs, projectRoot);
    // Cache will be populated automatically by toWirePath for external paths
  }
}

export function fromWirePath(wirePath: string, projectRoot: string): string {
  // Check if it's a virtual external path
  if (wirePath.startsWith('/.external/')) {
    // Look up in cache
    const cached = wirePathToAbsCache.get(wirePath);
    if (cached !== undefined) {
      return cached;
    }
    // Can't reverse map without cache - this shouldn't happen in practice
    debug('⚠ Cannot reverse map virtual path: %s', wirePath);
    return path.join(projectRoot, wirePath.substring(1)); // Fallback
  }

  // Normal path: remove leading slash and resolve relative to project root
  const relativePath = wirePath.startsWith('/') ? wirePath.substring(1) : wirePath;
  return path.join(projectRoot, relativePath);
}

// Store reverse mapping when creating wire paths
export function cacheWireMapping(wirePath: string, absPath: string): void {
  if (wirePath.startsWith('/.external/')) {
    wirePathToAbsCache.set(wirePath, absPath);
  }
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
