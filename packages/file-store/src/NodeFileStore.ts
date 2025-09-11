import * as fsp from 'fs/promises';
import * as path from 'path';
import * as url from 'url';
import type { Dirent } from 'fs';
import { toPosix } from './path';
import type { IExtendedFileStore } from './types';

const toAbs = (p: string) => {
  if (!p) return process.cwd();
  if (p.startsWith('file://')) return url.fileURLToPath(p);
  return path.isAbsolute(p) ? p : path.resolve(p);
};

export class NodeFileStore implements IExtendedFileStore {
  async write(p: string, data: Uint8Array): Promise<void> {
    const abs = toAbs(p);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, data);
  }

  async read(p: string): Promise<Uint8Array | null> {
    const abs = toAbs(p);
    try {
      const buf = await fsp.readFile(abs);
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async remove(p: string): Promise<void> {
    await fsp.rm(toAbs(p), { force: true });
  }

  async exists(p: string): Promise<boolean> {
    const abs = toAbs(p);
    try {
      await fsp.access(abs);
      return true;
    } catch {
      return false;
    }
  }

  async listTree(
    root: string = '/',
    opts?: {
      followSymlinkDirs?: boolean; // default: true
      includeSizes?: boolean; // default: false
      filePattern?: RegExp; // optional filter for files
    },
  ): Promise<Array<{ path: string; type: 'file' | 'dir'; size: number }>> {
    const followSymlinkDirs = opts?.followSymlinkDirs ?? true;
    const includeSizes = opts?.includeSizes ?? false;
    const filePattern = opts?.filePattern;

    const out: Array<{ path: string; type: 'file' | 'dir'; size: number }> = [];
    const seen = new Set<string>();

    const processSymlink = async (abs: string, posix: string) => {
      const st = await fsp.stat(abs).catch(() => null);
      if (!st) return;

      if (st.isDirectory()) {
        if (followSymlinkDirs) await walk(abs);
      } else {
        if (!filePattern || filePattern.test(posix)) {
          out.push({ path: posix, type: 'file', size: includeSizes ? st.size : 0 });
        }
      }
    };

    const processFile = async (abs: string, posix: string) => {
      if (!filePattern || filePattern.test(posix)) {
        if (includeSizes) {
          const st = await fsp.stat(abs).catch(() => null);
          out.push({ path: posix, type: 'file', size: st?.size ?? 0 });
        } else {
          out.push({ path: posix, type: 'file', size: 0 });
        }
      }
    };

    const walk = async (absDir: string) => {
      const posixDir = toPosix(absDir);
      if (seen.has(posixDir)) return;
      seen.add(posixDir);

      let entries: Dirent[];
      try {
        entries = await fsp.readdir(absDir, { withFileTypes: true });
      } catch {
        return;
      }

      out.push({ path: posixDir, type: 'dir', size: 0 });

      for (const e of entries) {
        const abs = path.join(absDir, e.name);
        const posix = toPosix(abs);

        try {
          if (e.isDirectory()) {
            await walk(abs);
          } else if (e.isSymbolicLink()) {
            await processSymlink(abs, posix);
          } else {
            await processFile(abs, posix);
          }
        } catch {
          // ignore races / perms / broken symlinks
        }
      }
    };

    await walk(toAbs(root));

    out.sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'dir' ? -1 : 1));
    return out;
  }

  async ensureDir(p: string): Promise<void> {
    const abs = toAbs(p);
    await fsp.mkdir(abs, { recursive: true });
  }

  async readdir(p: string): Promise<Array<{ name: string; type: 'file' | 'dir' }>> {
    const abs = toAbs(p);
    const entries = await fsp.readdir(abs, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }));
  }

  async readText(p: string): Promise<string | null> {
    const abs = toAbs(p);
    try {
      return await fsp.readFile(abs, 'utf-8');
    } catch {
      return null;
    }
  }

  async writeText(p: string, text: string): Promise<void> {
    const abs = toAbs(p);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, text, 'utf-8');
  }

  join(...parts: string[]): string {
    const joined = path.join(...parts.map((p) => (p.startsWith('file://') ? url.fileURLToPath(p) : p)));
    return toPosix(joined);
  }

  dirname(p: string): string {
    const abs = toAbs(p);
    return toPosix(path.dirname(abs));
  }

  fromHere(relative: string, base?: string): string {
    const b = base?.startsWith('file://') === true ? url.fileURLToPath(base) : (base ?? __dirname);
    return toPosix(path.resolve(b, relative));
  }
}
