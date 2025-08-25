import type { FileStore } from './types';
import { toPosix } from './path';
import * as fsp from 'fs/promises';
import type { Dirent } from 'fs';
import * as path from 'path';
import * as url from 'url';

const toAbs = (p: string) => {
  if (!p) return process.cwd();
  if (p.startsWith('file://')) return url.fileURLToPath(p);
  return path.isAbsolute(p) ? p : path.resolve(p);
};

export class NodeFileStore implements FileStore {
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

  async exists(p: string): Promise<boolean> {
    const abs = toAbs(p);
    try {
      await fsp.access(abs);
      return true;
    } catch {
      return false;
    }
  }

  async listTree(root: string = '/'): Promise<Array<{ path: string; type: 'file' | 'dir'; size: number }>> {
    const out: Array<{ path: string; type: 'file' | 'dir'; size: number }> = [];

    const walk = async (absDir: string) => {
      let entries: Dirent[];
      try {
        entries = await fsp.readdir(absDir, { withFileTypes: true });
      } catch {
        return;
      }

      out.push({ path: toPosix(absDir), type: 'dir', size: 0 });

      for (const e of entries) {
        const abs = path.join(absDir, e.name);
        if (e.isDirectory()) {
          await walk(abs);
        } else {
          const st = await fsp.stat(abs).catch(() => null);
          out.push({
            path: toPosix(abs),
            type: 'file',
            size: st?.size ?? 0,
          });
        }
      }
    };

    const absRoot = toAbs(root);
    await walk(absRoot);

    out.sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'dir' ? -1 : 1));
    return out;
  }
}
