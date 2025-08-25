import type { VfsLike, StatLike } from './index';

export class NodeVfs implements VfsLike {
  private fs!: typeof import('fs/promises');
  private path!: typeof import('path');
  private url!: typeof import('url');

  private async load() {
    this.fs = await import('fs/promises');
    this.path = await import('path');
    this.url = await import('url');
  }

  private async toAbsolute(p: string): Promise<string> {
    await this.load();
    if (!p) return process.cwd();
    if (p.startsWith('file://')) return this.url.fileURLToPath(p);
    return this.path.isAbsolute(p) ? p : this.path.resolve(p);
  }

  private statWrap(s: { isDirectory(): boolean }): StatLike {
    return {
      isDirectory: () => s.isDirectory(),
    };
  }

  async readFile(p: string, encoding: 'utf8' = 'utf8'): Promise<string> {
    await this.load();
    const abs = await this.toAbsolute(p);
    return this.fs.readFile(abs, { encoding }) as unknown as string;
  }

  async writeFile(p: string, data: string, encoding: 'utf8' = 'utf8'): Promise<void> {
    await this.load();
    const abs = await this.toAbsolute(p);
    await this.fs.mkdir(this.path.dirname(abs), { recursive: true });
    await this.fs.writeFile(abs, data, { encoding });
  }

  async readdir(p: string): Promise<string[]> {
    await this.load();
    const abs = await this.toAbsolute(p);
    return this.fs.readdir(abs);
  }

  async stat(p: string): Promise<StatLike> {
    await this.load();
    const abs = await this.toAbsolute(p);
    const s = await this.fs.stat(abs);
    return this.statWrap(s);
  }

  async exists(p: string): Promise<boolean> {
    await this.load();
    const abs = await this.toAbsolute(p);
    try {
      await this.fs.access(abs);
      return true;
    } catch {
      return false;
    }
  }
}
