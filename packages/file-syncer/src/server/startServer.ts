import chokidar from 'chokidar';
import path from 'path';
import { Server } from 'socket.io';
import { NodeFileStore } from '@auto-engineer/file-store';
import { computeDesiredSet } from '../sync/computeDesiredSet';
import { md5, readBase64, statSize } from '../utils/hash';
import { toWirePath } from '../utils/path';
import type { WireChange, WireInitial } from '../types/wire';

type FileMeta = { hash: string; size: number };

export async function startServer(watchDir: string) {
  const io = new Server(3001, { cors: { origin: '*' } });
  const projectRoot = path.dirname(watchDir);
  const vfs = new NodeFileStore();
  const active = new Map<string, FileMeta>();

  const compute = () => computeDesiredSet({ vfs, watchDir, projectRoot });

  async function initialFiles(): Promise<WireInitial> {
    const desired = await compute();

    const files: WireInitial['files'] = [];
    for (const abs of desired) {
      const content = await readBase64(vfs, abs);
      if (content === null) {
        continue;
      }
      const wire = toWirePath(abs, projectRoot);
      if (wire.startsWith('/..')) {
      }
      const size = await statSize(vfs, abs);
      const hash = await md5(vfs, abs);
      if (hash === null) {
        continue;
      }
      active.set(abs, { hash, size });
      files.push({ path: wire, content });
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { files };
  }

  async function computeChanges(desired: Set<string>): Promise<WireChange[]> {
    const outgoing: WireChange[] = [];
    for (const abs of desired) {
      const hash = await md5(vfs, abs);
      if (hash === null) {
        continue;
      }
      const size = await statSize(vfs, abs);
      const prev = active.get(abs);
      if (!prev || prev.hash !== hash || prev.size !== size) {
        const content = await readBase64(vfs, abs);
        if (content === null) {
          continue;
        }
        active.set(abs, { hash, size });
        const wire = toWirePath(abs, projectRoot);
        outgoing.push({ event: prev ? 'change' : 'add', path: wire, content });
      }
    }
    return outgoing;
  }

  function computeDeletions(desired: Set<string>): WireChange[] {
    const toDelete: WireChange[] = [];
    for (const abs of Array.from(active.keys())) {
      if (!desired.has(abs)) {
        active.delete(abs);
        const wire = toWirePath(abs, projectRoot);
        toDelete.push({ event: 'delete', path: wire });
      }
    }
    return toDelete;
  }

  async function rebuildAndBroadcast(): Promise<void> {
    const desired = await compute();
    const activeSizeBefore = active.size;
    const outgoing = await computeChanges(desired);
    const toDelete = computeDeletions(desired);
    for (const ch of toDelete) {
      io.emit('file-change', ch);
    }

    // if we just transitioned to empty, push empty snapshot to rebaseline clients
    if (active.size === 0 && desired.size === 0 && toDelete.length > 0) {
      io.emit('initial-sync', { files: [] });
      return;
    }

    // ---- rehydrate from empty → send a single authoritative snapshot ----
    const allAdds = outgoing.length > 0 && outgoing.every((x) => x.event === 'add');
    const rehydrateFromEmpty = activeSizeBefore === 0 && allAdds && desired.size === outgoing.length;

    if (rehydrateFromEmpty) {
      const files = outgoing
        .map((o) => ({ path: o.path, content: o.content! }))
        .sort((a, b) => a.path.localeCompare(b.path));
      io.emit('initial-sync', { files });
      return;
    }

    // otherwise: normal incremental flow
    for (const ch of outgoing) {
      io.emit('file-change', ch);
    }
  }

  const watcher = chokidar.watch([watchDir], { ignoreInitial: true, persistent: true });
  let debounce: NodeJS.Timeout | null = null;
  const scheduleRebuild = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      debounce = null;
      rebuildAndBroadcast().catch((err) => console.error('[sync] rebuild error', err));
    }, 100);
  };

  watcher
    .on('add', scheduleRebuild)
    .on('change', scheduleRebuild)
    .on('unlink', scheduleRebuild)
    .on('addDir', scheduleRebuild)
    .on('unlinkDir', scheduleRebuild)
    .on('error', (err) => console.error('[watcher]', err));

  io.on('connection', async (socket) => {
    try {
      const init = await initialFiles();
      socket.emit('initial-sync', init);
    } catch (e) {
      console.error('[sync] initial-sync failed:', e);
    }

    socket.on('client-file-change', async (msg: { event: 'write' | 'delete'; path: string; content?: string }) => {
      const relFromProject = msg.path.startsWith('/') ? msg.path.slice(1) : msg.path;
      const abs = path.join(projectRoot, relFromProject);
      try {
        if (msg.event === 'delete') {
          await vfs.remove(abs);
          active.delete(abs);
        } else {
          const contentStr = msg.content;
          if (contentStr === undefined) {
            console.warn('[sync] client write: no content provided');
            return;
          }
          const content = Buffer.from(contentStr, 'base64');
          await vfs.write(abs, new Uint8Array(content));
        }
      } catch (e) {
        console.error('[sync] client-file-change failed:', e);
      } finally {
        scheduleRebuild();
      }
    });
  });
}
