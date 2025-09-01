import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import type { Server as SocketIOServer } from 'socket.io';
import createDebug from 'debug';

const debug = createDebug('auto-engineer:server:file-syncer');

type FileEvent = 'add' | 'change' | 'delete' | 'write';

interface FileChangeMessage {
  event: FileEvent;
  path: string;
  content?: string;
}

export class FileSyncer {
  private watcher?: chokidar.FSWatcher;
  private io: SocketIOServer;
  private watchDir: string;
  private extensions: string[];

  constructor(io: SocketIOServer, watchDir = '.', extensions = ['.js', '.html', '.css']) {
    this.io = io;
    this.watchDir = watchDir;
    this.extensions = extensions;
  }

  /**
   * Start watching files for changes
   */
  start(): void {
    debug('Starting file syncer for directory:', this.watchDir);
    debug('Watching extensions:', this.extensions);

    // Set up file watcher
    this.watcher = chokidar.watch(this.watchDir, {
      ignored: /(^|[\\/\\])\./, // ignore dotfiles
      persistent: true,
    });

    this.watcher.on('all', (event, filePath) => {
      if (!this.extensions.some((ext) => filePath.endsWith(ext))) return;

      const relativePath = path.relative(this.watchDir, filePath);
      debug('File event:', event, relativePath);

      if (event === 'add' || event === 'change') {
        const content = fs.readFileSync(filePath, 'base64');
        this.io.emit('file-change', { event, path: relativePath, content });
      } else if (event === 'unlink') {
        this.io.emit('file-change', { event: 'delete', path: relativePath });
      }
    });

    // Handle client connections
    this.io.on('connection', (socket) => {
      debug('File sync client connected');

      // Send initial file sync
      this.getInitialFiles()
        .then((files) => {
          socket.emit('initial-sync', { files, directory: path.resolve(this.watchDir) });
          debug('Sent initial sync with', files.length, 'files');
        })
        .catch((err) => {
          console.error('Initial sync failed:', err);
        });

      // Handle client file changes
      socket.on('client-file-change', (data: FileChangeMessage) => {
        const fullPath = path.join(this.watchDir, data.path);
        const dir = path.dirname(fullPath);

        debug('Client file change:', data.event, data.path);

        try {
          if (data.event === 'delete') {
            fs.unlinkSync(fullPath);
          } else {
            fs.mkdirSync(dir, { recursive: true });
            const content = Buffer.from(data.content ?? '', 'base64');
            fs.writeFileSync(fullPath, content);
          }
        } catch (error) {
          console.error('Failed to handle client file change:', error);
        }
      });
    });
  }

  /**
   * Get all initial files for syncing
   */
  private async getInitialFiles(): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];

    const walk = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.watchDir, fullPath);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await walk(fullPath);
        } else if (entry.isFile() && this.extensions.some((ext) => relativePath.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, 'base64');
          files.push({ path: relativePath, content });
        }
      }
    };

    await walk(this.watchDir);
    return files;
  }

  /**
   * Stop watching files
   */
  stop(): void {
    if (this.watcher) {
      debug('Stopping file syncer');
      void this.watcher.close();
    }
  }
}
