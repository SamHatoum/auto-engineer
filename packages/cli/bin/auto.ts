#!/usr/bin/env node
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcPath = resolve(__dirname, '..', 'src', 'index.js');
const node = spawn('node', [srcPath, ...process.argv.slice(2)], { stdio: 'inherit' });

node.on('exit', (code) => {
  process.exit(code || 0);
});
