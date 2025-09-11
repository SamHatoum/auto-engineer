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
      followSymlinkDirs?: boolean;
      includeSizes?: boolean;
      pruneDirRegex?: RegExp;
    },
  ): Promise<Array<{ path: string; type: 'file' | 'dir'; size: number }>> {
    const followSymlinkDirs = opts?.followSymlinkDirs ?? true;
    const includeSizes = opts?.includeSizes ?? true;
    const pruneDirRegex = opts?.pruneDirRegex;

    const out: Array<{ path: string; type: 'file' | 'dir'; size: number }> = [];

    const shouldPrune = (posixPath: string): boolean => {
      return Boolean(pruneDirRegex?.test(posixPath));
    };

    const getFileSize = async (abs: string): Promise<number> => {
      if (!includeSizes) return 0;
      const st = await fsp.stat(abs).catch(() => null);
      return st?.size ?? 0;
    };

    const processRegularFile = async (abs: string, posixPath: string): Promise<void> => {
      const size = await getFileSize(abs);
      out.push({ path: posixPath, type: 'file', size });
    };

    const processSymlink = async (
      abs: string,
      posixPath: string,
      walk: (dir: string) => Promise<void>,
    ): Promise<void> => {
      const st = await fsp.stat(abs).catch(() => null);
      if (!st) return;

      if (st.isDirectory()) {
        if (followSymlinkDirs && !shouldPrune(posixPath)) {
          await walk(abs);
        }
      } else {
        const size = includeSizes ? st.size : 0;
        out.push({ path: posixPath, type: 'file', size });
      }
    };

    const processDirectory = async (
      abs: string,
      posixPath: string,
      walk: (dir: string) => Promise<void>,
    ): Promise<void> => {
      if (!shouldPrune(posixPath)) {
        await walk(abs);
      }
    };

    const walk = async (absDir: string): Promise<void> => {
      if (shouldPrune(toPosix(absDir))) return;

      let entries: Dirent[];
      try {
        entries = await fsp.readdir(absDir, { withFileTypes: true });
      } catch {
        return;
      }

      out.push({ path: toPosix(absDir), type: 'dir', size: 0 });

      for (const e of entries) {
        const abs = path.join(absDir, e.name);
        const posixPath = toPosix(abs);

        try {
          if (e.isDirectory()) {
            await processDirectory(abs, posixPath, walk);
          } else if (e.isSymbolicLink()) {
            await processSymlink(abs, posixPath, walk);
          } else {
            await processRegularFile(abs, posixPath);
          }
        } catch {
          // ignore races/perms
        }
      }
    };

    const absRoot = toAbs(root);
    await walk(absRoot);

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
