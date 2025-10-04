import chokidar from 'chokidar';
import path from 'path';
import type { Server as SocketIOServer } from 'socket.io';
import createDebug from 'debug';
import { NodeFileStore } from '@auto-engineer/file-store';
import { resolveSyncFileSet } from './sync/resolveSyncFileSet';
import { loadAutoConfig } from '../config-loader';
import { md5, readBase64, statSize } from './utils/hash';
import { toWirePath, fromWirePath, rebuildWirePathCache } from './utils/path';
import type { WireChange, WireInitial } from './types/wire';

const debug = createDebug('auto:cli:file-syncer');

type FileMeta = { hash: string; size: number };

export class FileSyncer {
  private io: SocketIOServer;
  private watchDir: string;
  private projectRoot: string;
  private vfs: NodeFileStore;
  private active: Map<string, FileMeta>;
  private watcher?: chokidar.FSWatcher;
  private debounce: NodeJS.Timeout | null = null;
  private autoConfigDebounce: NodeJS.Timeout | null = null;
  private lastComputeTime: number = 0;
  private cachedDesiredSet: Set<string> | null = null;
  private pendingInitialFiles: Promise<WireInitial> | null = null;
  private autoConfigHash: string | null = null;
  private autoConfigContent: unknown = null;

  constructor(io: SocketIOServer, watchDir = '.', _extensions?: string[]) {
    this.io = io;
    this.watchDir = path.resolve(watchDir);
    this.projectRoot = path.dirname(this.watchDir);
    this.vfs = new NodeFileStore();
    this.active = new Map<string, FileMeta>();
  }

  start(): void {
    const serializeConfig = (cfg: unknown) =>
      JSON.stringify(
        cfg,
        (key: string, value: unknown) => {
          if (typeof value === 'function') {
            const funcName = (value as { name?: string }).name;
            return `[Function: ${funcName != null ? funcName : 'anonymous'}]`;
          }
          return value;
        },
        2,
      );

    const getVirtualConfigWirePath = () => {
      const virtualPath = path.join(this.watchDir, 'auto.config.json');
      return toWirePath(virtualPath, this.projectRoot);
    };

    const compute = async () => {
      const now = Date.now();
      // Cache computeDesiredSet results for 1 second to prevent rapid repeated calls
      if (this.cachedDesiredSet && now - this.lastComputeTime < 1000) {
        return this.cachedDesiredSet;
      }

      const result = await resolveSyncFileSet({
        vfs: this.vfs,
        watchDir: this.watchDir,
        projectRoot: this.projectRoot,
      });
      this.cachedDesiredSet = result;
      this.lastComputeTime = now;
      return result;
    };

    const initialFiles = async (): Promise<WireInitial> => {
      const desired = await compute();
      const files: WireInitial['files'] = [];
      for (const abs of desired) {
        const content = await readBase64(this.vfs, abs);
        if (content === null) {
          console.warn(`[sync] Skipping file due to read failure: ${abs}`);
          continue;
        }
        const wire = toWirePath(abs, this.projectRoot);
        const size = await statSize(this.vfs, abs);
        const hash = await md5(this.vfs, abs);
        if (hash === null) {
          console.warn(`[sync] Skipping file due to hash failure: ${abs}`);
          continue;
        }
        this.active.set(abs, { hash, size });
        files.push({ path: wire, content });
      }
      if (this.autoConfigContent !== null) {
        const virtualContent = Buffer.from(serializeConfig(this.autoConfigContent), 'utf8').toString('base64');
        files.push({ path: getVirtualConfigWirePath(), content: virtualContent });
        debug('Added virtual auto.config.json to initial sync');
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

    const handleEmptyTransition = (desired: Set<string>, toDelete: WireChange[]): boolean => {
      if (this.active.size === 0 && desired.size === 0 && toDelete.length > 0) {
        this.io.emit('initial-sync', { files: [], directory: path.resolve(this.watchDir) });
        return true;
      }
      return false;
    };

    const handleRehydration = (activeSizeBefore: number, outgoing: WireChange[], desired: Set<string>): boolean => {
      const allAdds = outgoing.length > 0 && outgoing.every((x) => x.event === 'add');
      const rehydrateFromEmpty = activeSizeBefore === 0 && allAdds && desired.size === outgoing.length;

      if (rehydrateFromEmpty) {
        const files = outgoing
          .map((o) => ({ path: o.path, content: o.content! }))
          .sort((a, b) => a.path.localeCompare(b.path));
        debug('REHYDRATE: Sending initial-sync with %d files', files.length);
        this.io.emit('initial-sync', { files, directory: path.resolve(this.watchDir) });
        return true;
      }
      return false;
    };

    const rebuildAndBroadcast = async (): Promise<void> => {
      const desired = await compute();
      const activeSizeBefore = this.active.size;
      const outgoing = await computeChanges(desired);
      const toDelete = computeDeletions(desired);

      for (const ch of toDelete) {
        this.io.emit('file-change', ch);
      }

      if (handleEmptyTransition(desired, toDelete)) return;
      if (handleRehydration(activeSizeBefore, outgoing, desired)) return;

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

    const checkAndSyncAutoConfig = async () => {
      try {
        const autoConfigPath = await this.findAutoConfigFile();
        if (autoConfigPath === null) {
          if (this.autoConfigContent !== null) {
            debug('Auto config removed, emitting delete');
            // Create the virtual auto.config.json path relative to watchDir like regular files
            const virtualPath = path.join(this.watchDir, 'auto.config.json');
            const virtualWirePath = toWirePath(virtualPath, this.projectRoot);
            this.io.emit('file-change', { event: 'delete', path: virtualWirePath });
            this.autoConfigContent = null;
            this.autoConfigHash = null;
          }
          return;
        }

        const currentHash = await md5(this.vfs, autoConfigPath);
        if (currentHash === null || currentHash === this.autoConfigHash) {
          return;
        }

        debug('Auto config changed, executing and syncing');
        const config = await loadAutoConfig(autoConfigPath);
        const wasPresent = this.autoConfigContent !== null; // <-- capture before overwriting
        this.autoConfigContent = config;
        this.autoConfigHash = currentHash;
        const virtualContent = Buffer.from(serializeConfig(config), 'utf8').toString('base64');
        const virtualWirePath = getVirtualConfigWirePath();
        const eventType: WireChange['event'] = wasPresent ? 'change' : 'add';
        this.io.emit('file-change', {
          event: eventType,
          path: virtualWirePath,
          content: virtualContent,
        });
      } catch (error) {
        console.error('[sync] auto-config error:', error);
      }
    };

    const scheduleAutoConfigSync = () => {
      if (this.autoConfigDebounce) clearTimeout(this.autoConfigDebounce);
      this.autoConfigDebounce = setTimeout(() => {
        this.autoConfigDebounce = null;
        checkAndSyncAutoConfig().catch((err) => console.error('[sync] auto-config error', err));
      }, 100);
    };

    const isAutoConfigFile = (filePath: string): boolean => {
      const fileName = path.basename(filePath);
      return fileName === 'auto.config.ts' || fileName === 'auto.config.js';
    };

    this.watcher = chokidar.watch([this.watchDir], {
      ignoreInitial: true,
      persistent: true,
      ignored: ['**/node_modules/**', '**/.git/**', '**/.DS_Store'],
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });
    this.watcher
      .on('add', (filePath) => {
        scheduleRebuild();
        if (isAutoConfigFile(filePath)) {
          debug('Auto config file added: %s', filePath);
          scheduleAutoConfigSync();
        }
      })
      .on('change', (filePath) => {
        scheduleRebuild();
        if (isAutoConfigFile(filePath)) {
          debug('Auto config file changed: %s', filePath);
          scheduleAutoConfigSync();
        }
      })
      .on('unlink', (filePath) => {
        scheduleRebuild();
        if (isAutoConfigFile(filePath)) {
          debug('Auto config file removed: %s', filePath);
          scheduleAutoConfigSync();
        }
      })
      .on('addDir', (_dirPath) => {
        scheduleRebuild();
      })
      .on('unlinkDir', (_dirPath) => {
        scheduleRebuild();
      })
      .on('error', (err) => console.error('[watcher]', err));

    // Initial auto.config.ts sync
    scheduleAutoConfigSync();

    this.io.on('connection', async (socket) => {
      debug('New WebSocket client connected, preparing initial sync');

      try {
        // Create once, reuse while in-flight, and auto-clear on settle
        let wasFresh = false;
        if (!this.pendingInitialFiles) {
          this.pendingInitialFiles = initialFiles().finally(() => {
            this.pendingInitialFiles = null;
          });
          wasFresh = true;
        }

        const init = await this.pendingInitialFiles;

        if (wasFresh) {
          // Rebuild wire path cache for external mappings to support reconnection
          const files = Array.from(this.active.keys()).map((abs) => ({ abs, projectRoot: this.projectRoot }));
          rebuildWirePathCache(files);
        }

        socket.emit('initial-sync', init);
        debug(`Sent ${wasFresh ? 'fresh' : 'cached'} initial-sync to client`);
      } catch (e) {
        console.error('[sync] initial-sync failed:', e);
        this.pendingInitialFiles = null; // Clear on error
      }

      socket.on('client-file-change', async (msg: { event: 'write' | 'delete'; path: string; content?: string }) => {
        const abs = fromWirePath(msg.path, this.projectRoot);
        // Block client edits to the virtual auto.config.json (one-way TS -> JSON)
        const virtualAbs = path.join(this.watchDir, 'auto.config.json');
        if (path.resolve(abs) === path.resolve(virtualAbs)) {
          debug('[sync] ignoring client attempt to modify virtual auto.config.json (%s)', msg.event);
          return;
        }
        const allowedRoot = path.resolve(this.watchDir) + path.sep;
        const normalizedAbs = path.resolve(abs);
        if (!normalizedAbs.startsWith(allowedRoot)) {
          console.warn('[sync] blocked client write outside watchDir:', {
            requested: msg.path,
            resolved: normalizedAbs,
          });
          return;
        }

        try {
          if (msg.event === 'delete') {
            await this.vfs.remove(normalizedAbs);
            this.active.delete(normalizedAbs);
          } else {
            const contentStr = msg.content;
            if (contentStr === undefined) {
              console.warn('[sync] client write: no content provided');
              return;
            }
            const content = Buffer.from(contentStr, 'base64');
            await this.vfs.write(normalizedAbs, new Uint8Array(content));
          }
        } catch (e) {
          console.error('[sync] client-file-change failed:', e);
        } finally {
          scheduleRebuild();
        }
      });
    });
  }

  private async findAutoConfigFile(): Promise<string | null> {
    const candidates = [path.join(this.watchDir, 'auto.config.ts'), path.join(this.watchDir, 'auto.config.js')];

    for (const candidate of candidates) {
      try {
        const exists = await this.vfs.exists(candidate);
        if (exists) {
          return candidate;
        }
      } catch {
        // Ignore errors and try next candidate
      }
    }

    return null;
  }

  stop(): void {
    if (this.watcher) {
      void this.watcher.close();
    }
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    if (this.autoConfigDebounce) {
      clearTimeout(this.autoConfigDebounce);
    }
  }
}
