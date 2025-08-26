import LightningFS from '@isomorphic-git/lightning-fs';
import type { IFileStore } from './types';
import { dirname } from './path';

interface LightningFSStats {
  isDirectory(): boolean;
  size: number;
}

interface LightningFSPromises {
  writeFile(path: string, data: Uint8Array): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  stat(path: string): Promise<LightningFSStats>;
  readdir(path: string): Promise<string[]>;
  mkdir(path: string): Promise<void>;
}

interface LightningFSInstance {
  promises: LightningFSPromises;
}

export class LightningFileStore implements IFileStore {
  private fs: LightningFSInstance;
  private pfs: LightningFSPromises;

  constructor(name = 'pocfs') {
    this.fs = new LightningFS(name) as LightningFSInstance;
    this.pfs = this.fs.promises;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    await this.mkdirp(dirname(path));
    await this.pfs.writeFile(path, data);
  }

  async read(path: string): Promise<Uint8Array | null> {
    try {
      return await this.pfs.readFile(path);
    } catch {
      return null;
    }
  }

  async exists(path: string): Promise<boolean> {
    return await this.pfs
      .stat(path)
      .then(() => true)
      .catch(() => false);
  }

  async listTree(root: string = '/'): Promise<Array<{ path: string; type: 'file' | 'dir'; size: number }>> {
    const out: Array<{ path: string; type: 'file' | 'dir'; size: number }> = [];
    const walk = async (p: string) => {
      let st: LightningFSStats | null = null;
      try {
        st = await this.pfs.stat(p);
      } catch {
        return;
      }

      if (st !== null && st.isDirectory()) {
        out.push({ path: p, type: 'dir', size: 0 });
        let entries: string[] = [];
        try {
          entries = await this.pfs.readdir(p);
        } catch {
          /* ignore */
        }
        for (const name of entries) {
          const child = p === '/' ? `/${name}` : `${p}/${name}`;
          await walk(child);
        }
      } else {
        out.push({ path: p, type: 'file', size: st?.size ?? 0 });
      }
    };
    await walk(root);
    out.sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'dir' ? -1 : 1));
    return out;
  }

  private async mkdirp(path: string): Promise<void> {
    if (!path || path === '/') return;
    const parts = path.split('/').filter(Boolean);
    let cur = '';
    for (const part of parts) {
      cur += '/' + part;
      const exists = await this.pfs
        .stat(cur)
        .then(() => true)
        .catch(() => false);
      if (!exists) await this.pfs.mkdir(cur);
    }
  }
}
