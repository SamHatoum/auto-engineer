#!/usr/bin/env node

import { spawn } from 'child_process';
import chokidar from 'chokidar';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const srcDir = join(packageRoot, 'src');
const distDir = join(packageRoot, 'dist', 'src');

console.log('🔄 Starting CLI watch mode...');

// Start TypeScript compiler in watch mode
const tscProcess = spawn('pnpm', ['exec', 'tsc', '--watch'], {
  cwd: packageRoot,
  stdio: 'inherit',
  shell: true,
});

// Watch for HTML and SVG file changes
const watcher = chokidar.watch(['src/server/*.html', 'src/server/*.svg'], {
  cwd: packageRoot,
  ignoreInitial: false,
  persistent: true,
});

function copyAsset(filePath) {
  const relPath = relative(srcDir, filePath);
  const destPath = join(distDir, relPath);

  try {
    // Ensure destination directory exists
    mkdirSync(dirname(destPath), { recursive: true });

    // Copy the file
    copyFileSync(filePath, destPath);
    console.log(`📋 Copied: ${relPath}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${relPath}:`, error.message);
  }
}

// Copy files on initial load and when changed
watcher.on('add', (path) => {
  const fullPath = join(packageRoot, path);
  copyAsset(fullPath);
});

watcher.on('change', (path) => {
  const fullPath = join(packageRoot, path);
  copyAsset(fullPath);
  console.log(`🔄 Updated: ${path}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Stopping watch mode...');
  tscProcess.kill();
  watcher.close();
  process.exit(0);
});

console.log('👁️  Watching TypeScript and asset files...');
