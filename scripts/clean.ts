#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { glob } from 'glob';

const cleanDirectories = async () => {
  // Remove node_modules directories
  const nodeModulesDirs = await glob('**/node_modules', { ignore: ['node_modules'] });
  nodeModulesDirs.forEach((dir) => {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`Removed: ${dir}`);
    }
  });

  // Remove other build/cache directories
  const dirsToRemove = ['dist', '.turbo', 'coverage', '.next', 'build', '.cache'];
  for (const dirName of dirsToRemove) {
    const dirs = await glob(`**/${dirName}`, { ignore: ['node_modules/**'] });
    dirs.forEach((dir) => {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
        console.log(`Removed: ${dir}`);
      }
    });
  }

  // Remove TypeScript build info files
  const tsBuildInfoFiles = await glob('**/*.tsbuildinfo', { ignore: ['node_modules/**'] });
  tsBuildInfoFiles.forEach((file) => {
    if (existsSync(file)) {
      rmSync(file, { force: true });
      console.log(`Removed: ${file}`);
    }
  });

  // Remove root node_modules and .pnpm-store
  if (existsSync('node_modules')) {
    rmSync('node_modules', { recursive: true, force: true });
    console.log('Removed: node_modules');
  }

  if (existsSync('.pnpm-store')) {
    rmSync('.pnpm-store', { recursive: true, force: true });
    console.log('Removed: .pnpm-store');
  }

  // Install dependencies
  console.log('Installing dependencies...');
  execSync('pnpm install', { stdio: 'inherit' });
};

cleanDirectories().catch(console.error);
