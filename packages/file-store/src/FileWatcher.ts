import { EventEmitter } from 'eventemitter3';
import picomatch from 'picomatch';
import md5 from 'md5';
import type { ChangeKind, FileChange, FileEncoding, IFileStore } from './types';

type Events = { change: (c: FileChange) => void };

export class FileWatcher {
  private store: IFileStore;
  private bus = new EventEmitter<Events>();
  private index = new Map<string, string>();

  constructor(store: IFileStore) {
    this.store = store;
  }

  onChange(cb: (c: FileChange) => void) {
    this.bus.on('change', cb);
    return () => this.bus.off('change', cb);
  }

  watch(glob: string | string[], cb: (c: FileChange) => void) {
    const isMatch = picomatch(glob, { dot: true });
    return this.onChange((c) => {
      if (isMatch(c.path)) cb(c);
    });
  }

  async writeFile(path: string, content: string | ArrayBuffer | Uint8Array, enc: FileEncoding = 'utf8') {
    const data = this.toBytes(content, enc);
    const prevHash = this.index.get(path) ?? (await this.computeExistingHash(path));
    const nextHash = md5(data);
    if (prevHash === nextHash) return;
    await this.store.write(path, data);
    this.index.set(path, nextHash);
    const kind: ChangeKind = prevHash !== undefined ? 'updated' : 'created';
    this.bus.emit('change', { path, kind, hash: nextHash, size: data.byteLength });
  }

  async deleteFile(path: string) {
    const existed = await this.store.exists(path);
    if (!existed) return;
    await this.store.remove(path);
    this.index.delete(path);
    this.bus.emit('change', { path, kind: 'deleted' });
  }

  async seed(root = '/') {
    const entries = await this.store.listTree(root);
    for (const e of entries) {
      if (e.type === 'file') {
        const buf = await this.store.read(e.path);
        if (buf) this.index.set(e.path, md5(buf));
      }
    }
  }

  private async computeExistingHash(path: string) {
    if (!(await this.store.exists(path))) return undefined;
    const buf = await this.store.read(path);
    if (!buf) return undefined;
    const h = md5(buf);
    this.index.set(path, h);
    return h;
  }

  private toBytes(content: string | ArrayBuffer | Uint8Array, enc: FileEncoding): Uint8Array {
    if (content instanceof Uint8Array) return content;
    if (content instanceof ArrayBuffer) return new Uint8Array(content);
    if (enc === 'base64') return Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
    return new TextEncoder().encode(content);
  }
}
