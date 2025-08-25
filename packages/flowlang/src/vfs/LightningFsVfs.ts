import type { VfsLike, StatLike } from './index';

type LightningFsCtor = new (name: string) => { promises: LightningFsPromises };

interface LightningFsPromises {
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(path: string, data: string, encoding?: string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ isDirectory(): boolean }>;
  mkdir(path: string): Promise<void>;
}

export class LightningFsVfs implements VfsLike {
  private promises: LightningFsPromises;

  private constructor(promises: LightningFsPromises) {
    this.promises = promises;
  }

  /** Build from an existing LightningFS instance (or its .promises) */
  static from(fsOrPromises: { promises: LightningFsPromises } | LightningFsPromises): LightningFsVfs {
    const promises = 'promises' in fsOrPromises ? fsOrPromises.promises : fsOrPromises;
    return new LightningFsVfs(promises);
  }

  /** Convenience: create by FS name (for browser). */
  static async byName(name = 'flowfs'): Promise<LightningFsVfs> {
    const mod = (await import('@isomorphic-git/lightning-fs')) as { default: LightningFsCtor };
    const FS = mod.default;
    const inst = new FS(name);
    return new LightningFsVfs(inst.promises);
  }

  private statWrap(s: { isDirectory(): boolean }): StatLike {
    return { isDirectory: () => s.isDirectory() };
  }

  async readFile(p: string, encoding: 'utf8' = 'utf8'): Promise<string> {
    return this.promises.readFile(p, encoding);
  }

  async writeFile(p: string, data: string, encoding: 'utf8' = 'utf8'): Promise<void> {
    // mkdir -p parents (LightningFS requires manual ensure)
    const parts = p.split('/').filter(Boolean);
    const dirs = parts.slice(0, -1);
    let cur = '';
    for (const d of dirs) {
      cur += '/' + d;
      try {
        const st = await this.promises.stat(cur);
        if (!st.isDirectory()) throw new Error(`${cur} exists and is not a directory`);
      } catch {
        try {
          await this.promises.mkdir(cur);
        } catch {
          /* ignore */
        }
      }
    }
    await this.promises.writeFile(p, data, encoding);
  }

  async readdir(p: string): Promise<string[]> {
    return this.promises.readdir(p);
  }

  async stat(p: string): Promise<StatLike> {
    const s = await this.promises.stat(p);
    return this.statWrap(s);
  }

  async exists(p: string): Promise<boolean> {
    try {
      await this.promises.stat(p);
      return true;
    } catch {
      return false;
    }
  }
}
