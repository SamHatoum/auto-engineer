#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

try {
  // Get global pnpm directory
  const globalNodeModules = execSync('pnpm root -g', { encoding: 'utf-8' }).trim();
  const globalDir = path.dirname(globalNodeModules);
  const pkgPath = path.join(globalDir, 'package.json');

  console.log(`Cleaning auto-engineer packages from: ${pkgPath}`);

  // Read and parse package.json
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  // Remove all @auto-engineer dependencies
  const deps = pkg.dependencies || {};
  const toRemove = Object.keys(deps).filter((k) => k.includes('auto-engineer'));

  if (toRemove.length === 0) {
    console.log('No auto-engineer packages found in global dependencies');
    process.exit(0);
  }

  console.log(`Removing packages: ${toRemove.join(', ')}`);
  toRemove.forEach((k) => delete deps[k]);

  // Write updated package.json
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
  console.log('Updated package.json');

  // Run pnpm install in global directory
  console.log('Running pnpm install...');
  execSync('pnpm install', {
    cwd: globalDir,
    stdio: 'inherit',
  });

  console.log('Successfully cleaned auto-engineer packages from global pnpm');
} catch (error) {
  console.error('Error cleaning global packages:', error.message);
  process.exit(1);
}
