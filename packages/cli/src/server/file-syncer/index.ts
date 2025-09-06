import chokidar from 'chokidar';
import path from 'path';
import type { Server as SocketIOServer } from 'socket.io';
import { NodeFileStore } from '@auto-engineer/file-store';
import { computeDesiredSet } from './sync/computeDesiredSet';
import { md5, readBase64, statSize } from './utils/hash';
import { toWirePath } from './utils/path';
import type { WireChange, WireInitial } from './types/wire';

type FileMeta = { hash: string; size: number };

export class FileSyncer {
  private io: SocketIOServer;
  private watchDir: string;
  private projectRoot: string;
  private vfs: NodeFileStore;
  private active: Map<string, FileMeta>;
  private watcher?: chokidar.FSWatcher;
  private debounce: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer, watchDir = '.', _extensions?: string[]) {
    this.io = io;
    this.watchDir = path.resolve(watchDir);
    this.projectRoot = path.dirname(this.watchDir);
    this.vfs = new NodeFileStore();
    this.active = new Map<string, FileMeta>();
  }

  start(): void {
    const compute = () => computeDesiredSet({ vfs: this.vfs, watchDir: this.watchDir, projectRoot: this.projectRoot });

    const initialFiles = async (): Promise<WireInitial> => {
      const desired = await compute();

      const files: WireInitial['files'] = [];
      for (const abs of desired) {
        const content = await readBase64(this.vfs, abs);
        if (content === null) {
          continue;
        }
        const wire = toWirePath(abs, this.projectRoot);
        const size = await statSize(this.vfs, abs);
        const hash = await md5(this.vfs, abs);
        if (hash === null) {
          continue;
        }
        this.active.set(abs, { hash, size });
        files.push({ path: wire, content });
      }
      files.sort((a, b) => a.path.localeCompare(b.path));
      return { files, directory: path.resolve(this.watchDir) };
    };

    const computeChanges = async (desired: Set<string>): Promise<WireChange[]> => {
      const outgoing: WireChange[] = [];
      for (const abs of desired) {
        const hash = await md5(this.vfs, abs);
        if (hash === null) {
          continue;
        }
        const size = await statSize(this.vfs, abs);
        const prev = this.active.get(abs);
        if (!prev || prev.hash !== hash || prev.size !== size) {
          const content = await readBase64(this.vfs, abs);
          if (content === null) {
            continue;
          }
          this.active.set(abs, { hash, size });
          const wire = toWirePath(abs, this.projectRoot);
          outgoing.push({ event: prev ? 'change' : 'add', path: wire, content });
        }
      }
      return outgoing;
    };

    const computeDeletions = (desired: Set<string>): WireChange[] => {
      const toDelete: WireChange[] = [];
      for (const abs of Array.from(this.active.keys())) {
        if (!desired.has(abs)) {
          this.active.delete(abs);
          const wire = toWirePath(abs, this.projectRoot);
          toDelete.push({ event: 'delete', path: wire });
        }
      }
      return toDelete;
    };

    const rebuildAndBroadcast = async (): Promise<void> => {
      const desired = await compute();
      const activeSizeBefore = this.active.size;
      const outgoing = await computeChanges(desired);
      const toDelete = computeDeletions(desired);
      for (const ch of toDelete) {
        this.io.emit('file-change', ch);
      }

      // if we just transitioned to empty, push empty snapshot to rebaseline clients
      if (this.active.size === 0 && desired.size === 0 && toDelete.length > 0) {
        this.io.emit('initial-sync', { files: [], directory: path.resolve(this.watchDir) });
        return;
      }

      // ---- rehydrate from empty → send a single authoritative snapshot ----
      const allAdds = outgoing.length > 0 && outgoing.every((x) => x.event === 'add');
      const rehydrateFromEmpty = activeSizeBefore === 0 && allAdds && desired.size === outgoing.length;

      if (rehydrateFromEmpty) {
        const files = outgoing
          .map((o) => ({ path: o.path, content: o.content! }))
          .sort((a, b) => a.path.localeCompare(b.path));
        this.io.emit('initial-sync', { files, directory: path.resolve(this.watchDir) });
        return;
      }

      // otherwise: normal incremental flow
      for (const ch of outgoing) {
        this.io.emit('file-change', ch);
      }
    };

    const scheduleRebuild = () => {
      if (this.debounce) clearTimeout(this.debounce);
      this.debounce = setTimeout(() => {
        this.debounce = null;
        rebuildAndBroadcast().catch((err) => console.error('[sync] rebuild error', err));
      }, 100);
    };

    this.watcher = chokidar.watch([this.watchDir], { ignoreInitial: true, persistent: true });
    this.watcher
      .on('add', scheduleRebuild)
      .on('change', scheduleRebuild)
      .on('unlink', scheduleRebuild)
      .on('addDir', scheduleRebuild)
      .on('unlinkDir', scheduleRebuild)
      .on('error', (err) => console.error('[watcher]', err));

    this.io.on('connection', async (socket) => {
      try {
        const init = await initialFiles();
        socket.emit('initial-sync', init);
      } catch (e) {
        console.error('[sync] initial-sync failed:', e);
      }

      socket.on('client-file-change', async (msg: { event: 'write' | 'delete'; path: string; content?: string }) => {
        const relFromProject = msg.path.startsWith('/') ? msg.path.slice(1) : msg.path;
        const abs = path.join(this.projectRoot, relFromProject);
        try {
          if (msg.event === 'delete') {
            await this.vfs.remove(abs);
            this.active.delete(abs);
          } else {
            const contentStr = msg.content;
            if (contentStr === undefined) {
              console.warn('[sync] client write: no content provided');
              return;
            }
            const content = Buffer.from(contentStr, 'base64');
            await this.vfs.write(abs, new Uint8Array(content));
          }
        } catch (e) {
          console.error('[sync] client-file-change failed:', e);
        } finally {
          scheduleRebuild();
        }
      });
    });
  }

  stop(): void {
    if (this.watcher) {
      void this.watcher.close();
    }
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
  }
}
