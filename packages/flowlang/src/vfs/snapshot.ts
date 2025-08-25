import type { VfsLike, StatLike } from './index';
import { toPosix } from './index';

/**
 * Snapshot VFS backed by an in-memory map of file contents.
 * Great for worker builds to avoid LightningFS debounce races.
 */
export interface SnapshotOptions {
  // If provided, used to precompute directory structure for readdir/stat.
  // Otherwise we derive dirs from file keys on the fly.
  preloadDirs?: boolean;
}

export function createSnapshotVfs(files: Record<string, string>, opts: SnapshotOptions = {}): VfsLike {
  const store: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) {
    store[toPosix(k)] = v;
  }

  // Build a directory index for quick stat/readdir.
  const dirChildren = new Map<string, Set<string>>();

  const addPath = (abs: string) => {
    const parts = toPosix(abs).split('/').filter(Boolean);
    let cur = '';
    for (let i = 0; i < parts.length - 1; i++) {
      cur += '/' + parts[i];
      if (!dirChildren.has(cur)) dirChildren.set(cur, new Set());
      dirChildren.get(cur)!.add(parts[i + 1]);
    }
  };

  if (opts.preloadDirs === true) {
    for (const p of Object.keys(store)) addPath(p);
  }

  const ensureIndexed = (abs: string) => {
    // derive directory entries on the fly if not indexed
    const dir = toPosix(abs);
    if (dirChildren.has(dir)) return;
    const children = new Set<string>();
    const prefix = dir.endsWith('/') ? dir : dir + '/';
    for (const file of Object.keys(store)) {
      if (file.startsWith(prefix)) {
        const rest = file.slice(prefix.length);
        const head = rest.split('/')[0];
        if (head) children.add(head);
      }
    }
    if (children.size > 0) dirChildren.set(dir, children);
  };

  const statWrap = (isDir: boolean): StatLike => ({
    isDirectory: () => isDir,
  });

  return {
    async readFile(p: string, _encoding: 'utf8' = 'utf8'): Promise<string> {
      const key = toPosix(p);
      if (!(key in store)) throw new Error(`SnapshotVFS: readFile not found: ${p}`);
      // Only 'utf8' supported in this minimal adapter
      return store[key];
    },
    async writeFile(p: string, data: string): Promise<void> {
      const key = toPosix(p);
      store[key] = data;
      addPath(key);
    },
    async readdir(p: string): Promise<string[]> {
      const dir = toPosix(p);
      ensureIndexed(dir);
      return Array.from(dirChildren.get(dir) ?? []);
    },
    async stat(p: string): Promise<StatLike> {
      const key = toPosix(p);
      if (key in store) return statWrap(false);
      ensureIndexed(key);
      const isDir = (dirChildren.get(key) ?? new Set()).size > 0;
      if (!isDir) {
        // Could be root or empty dir not yet known; treat root specially
        if (key === '/' || key === '') return statWrap(true);
        // If neither file nor directory, throw to match Node-ish semantics
        throw new Error(`SnapshotVFS: stat ENOENT: ${p}`);
      }
      return statWrap(true);
    },
    async exists(p: string): Promise<boolean> {
      const key = toPosix(p);
      if (key in store) return true;
      ensureIndexed(key);
      return (dirChildren.get(key) ?? new Set()).size > 0 || key === '/';
    },
  };
}
