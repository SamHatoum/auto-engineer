import { IFileStore } from './types';

export class InMemoryFileStore implements IFileStore {
  private files = new Map<string, Uint8Array>();

  private norm(p: string) {
    if (!p) return '/';
    return p.startsWith('/') ? p : `/${p}`;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    this.files.set(this.norm(path), new Uint8Array(data));
  }

  async read(path: string): Promise<Uint8Array | null> {
    const buf = this.files.get(this.norm(path));
    return buf ? new Uint8Array(buf) : null;
  }

  async remove(path: string): Promise<void> {
    const prefix = this.norm(path);
    for (const key of Array.from(this.files.keys())) {
      if (key === prefix || key.startsWith(prefix.endsWith('/') ? prefix : prefix + '/')) {
        this.files.delete(key);
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    const p = this.norm(path);
    if (this.files.has(p)) return true;
    for (const key of this.files.keys()) {
      if (key.startsWith(p.endsWith('/') ? p : p + '/')) return true;
    }
    return false;
  }

  async listTree(root: string = '/'): Promise<Array<{ path: string; type: 'file' | 'dir'; size: number }>> {
    const r = this.norm(root);
    const files = Array.from(this.files.entries()).filter(
      ([p]) => p === r || p.startsWith(r.endsWith('/') ? r : r + '/'),
    );

    const dirs = new Set<string>(['/']);
    for (const [p] of files) {
      const parts = p.split('/').filter(Boolean);
      let cur = '';
      for (let i = 0; i < parts.length - 1; i++) {
        cur += '/' + parts[i];
        dirs.add(cur || '/');
      }
    }

    const out: Array<{ path: string; type: 'file' | 'dir'; size: number }> = [];
    for (const d of Array.from(dirs)) {
      if (d === '/' || d.startsWith(r.endsWith('/') ? r : r + '/')) {
        out.push({ path: d, type: 'dir', size: 0 });
      }
    }

    for (const [p, buf] of files) {
      out.push({ path: p, type: 'file', size: buf.byteLength });
    }

    out.sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'dir' ? -1 : 1));
    return out;
  }
}
