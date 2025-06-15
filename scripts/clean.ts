#!/usr/bin/env tsx

import { execSync } from 'child_process';

const commands = [
  'rm -rf node_modules',
  'rm -rf packages/*/node_modules',
  'rm -rf apps/*/node_modules',
  'rm -rf .pnpm-store',
  'find . -type d -name "node_modules" -exec rm -rf {} +',
  'find . -type d -name "dist" -exec rm -rf {} +',
  'find . -type d -name ".turbo" -exec rm -rf {} +',
  'find . -type d -name "coverage" -exec rm -rf {} +',
  'find . -type d -name ".next" -exec rm -rf {} +',
  'find . -type d -name "build" -exec rm -rf {} +',
  'find . -name "*.tsbuildinfo" -delete',
  'find . -type d -name ".cache" -exec rm -rf {} +',
  'pnpm install'
];

commands.forEach(cmd => {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Failed to execute: ${cmd}`, err);
    process.exit(1);
  }
}); 