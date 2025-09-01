#!/usr/bin/env node
import path from 'path';
import { startServer } from './server/startServer.js';

const watchDir = path.resolve(process.argv[2] || '.');
startServer(watchDir).catch((err) => {
  console.error('[file-syncer] fatal:', err);
  process.exit(1);
});
