// One interface, plus small shared utilities (pure functions)

export interface StatLike {
  isDirectory(): boolean;
}

export interface VfsLike {
  readFile(path: string, encoding?: 'utf8'): Promise<string>;
  writeFile(path: string, data: string, encoding?: 'utf8'): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<StatLike>;
  exists(path: string): Promise<boolean>;
}

// ---- Small helpers (stay as functions; not tied to an impl) ----

export const toPosix = (p: string): string => p.replace(/\\/g, '/');

export const join = (...parts: string[]): string => {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) return '/';
  const isAbs = filtered[0].startsWith('/');
  const joined = toPosix(filtered.map((s) => s.replace(/^\/+|\/+$/g, '')).join('/'));
  return isAbs ? `/${joined}` : joined;
};

export const dirname = (p: string): string => {
  const n = toPosix(p);
  const i = n.lastIndexOf('/');
  if (i <= 0) return '/';
  return n.slice(0, i);
};

export async function walk(vfs: VfsLike, root: string, dir = '', acc: string[] = []): Promise<string[]> {
  const here = dir ? join(root, dir) : root;
  let names: string[];
  try {
    names = await vfs.readdir(here);
  } catch {
    return acc;
  }

  for (const name of names) {
    const rel = dir ? join(dir, name) : name;
    const abs = join(root, rel);
    try {
      const st = await vfs.stat(abs);
      if (st.isDirectory()) {
        await walk(vfs, root, rel, acc);
      } else {
        acc.push(abs);
      }
    } catch {
      // ignore ENOENT-like issues to mirror fast-glob resilience
      continue;
    }
  }
  return acc;
}

export const filterByRegex = (paths: string[], pattern: RegExp): string[] =>
  paths.filter((p) => pattern.test(toPosix(p)));
