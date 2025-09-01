import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';

const io = new Server(3001, {
  cors: { origin: '*' },
});

type FileEvent = 'add' | 'change' | 'delete' | 'write';

interface FileChangeMessage {
  event: FileEvent;
  path: string;
  content?: string;
}

const watchDir = process.argv[2] || '.';

const FILE_GLOB = '**/*.ts';
const FILE_EXT = '.ts';

async function getInitialFiles(): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];

  const walk = async (dir: string) => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(watchDir, fullPath);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (relativePath.endsWith(FILE_EXT)) {
          const content = fs.readFileSync(fullPath, 'base64');
          files.push({ path: relativePath, content });
        }
      }
    }
  };

  await walk(watchDir);
  return files;
}

chokidar.watch(path.join(watchDir, FILE_GLOB)).on('all', (event, filePath) => {
  const relativePath = path.relative(watchDir, filePath);

  if (!relativePath.endsWith(FILE_EXT)) return;

  if (event === 'add' || event === 'change') {
    const content = fs.readFileSync(filePath, 'base64');
    io.emit('file-change', { event, path: relativePath, content });
  } else if (event === 'unlink') {
    io.emit('file-change', { event: 'delete', path: relativePath });
  }
});

io.on('connection', (socket) => {
  getInitialFiles()
    .then((files) => socket.emit('initial-sync', { files }))
    .catch((err) => console.error('Initial sync failed:', err));

  socket.on('client-file-change', (data: FileChangeMessage) => {
    const fullPath = path.join(watchDir, data.path);
    const dir = path.dirname(fullPath);

    if (data.event === 'delete') {
      fs.unlinkSync(fullPath);
    } else {
      fs.mkdirSync(dir, { recursive: true });
      const content = Buffer.from(data?.content ?? '', 'base64');
      fs.writeFileSync(fullPath, content);
    }
  });
});

console.log(`Two-way sync on ${watchDir} for ${FILE_GLOB} files on ws://localhost:3001`);
