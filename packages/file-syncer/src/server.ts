import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { Server } from 'socket.io';

const io = new Server(3000, {
  cors: { origin: '*' },
});

type FileEvent = 'add' | 'change' | 'delete' | 'write';

interface FileChangeMessage {
  event: FileEvent;
  path: string;
  content?: string;
}

const watchDir = process.argv[2] || '.';
const extensions = process.argv[3] ? process.argv[3]?.split(',') : ['.js', '.html', '.css'];

chokidar.watch(watchDir).on('all', (event, filePath) => {
  if (!extensions.some((ext) => filePath.endsWith(ext))) return;

  const relativePath = path.relative(watchDir, filePath);

  if (event === 'add' || event === 'change') {
    const content = fs.readFileSync(filePath, 'base64');
    io.emit('file-change', { event, path: relativePath, content });
  } else if (event === 'unlink') {
    io.emit('file-change', { event: 'delete', path: relativePath });
  }
});

io.on('connection', (socket) => {
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

console.log(`Two-way sync on ${watchDir} for ${extensions.join(', ')} files on ws://localhost:3000`);
