#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

const CORE_PACKAGES = ['@auto-engineer/message-bus', '@auto-engineer/ai-gateway'];
const STARTUP_DELAY = 3000; // Wait 3 seconds for core packages to start

function log(message: string) {
  console.log(`[dev-script] ${message}`);
}

async function waitForFiles(filePaths: string[], maxWait = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const allExist = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      }),
    );

    if (allExist.every(Boolean)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function main() {
  log('Starting core packages first...');

  // Start core packages
  const coreProcess = spawn(
    'npx',
    [
      'turbo',
      'run',
      'dev:core',
      '--filter',
      `@auto-engineer/message-bus`,
      '--filter',
      `@auto-engineer/ai-gateway`,
      '--concurrency=2',
    ],
    {
      stdio: 'inherit',
      shell: true,
    },
  );

  // Wait for initial startup
  await new Promise((resolve) => setTimeout(resolve, STARTUP_DELAY));

  // Check if core packages have built their initial .d.ts files
  const coreDistFiles = [
    'packages/message-bus/dist/types.d.ts',
    'packages/message-bus/dist/index.d.ts',
    'packages/ai-gateway/dist/index.d.ts',
    'packages/ai-gateway/dist/constants.d.ts',
  ];

  log('Waiting for core packages to generate type definitions...');
  const filesReady = await waitForFiles(coreDistFiles);

  if (!filesReady) {
    log('Warning: Core packages may not be fully ready, but starting other packages anyway');
  } else {
    log('Core packages ready! Starting all other packages...');
  }

  // Start all other packages (excluding core ones)
  const otherProcess = spawn(
    'npx',
    [
      'turbo',
      'run',
      'dev',
      '--filter',
      './packages/*',
      '--filter',
      './examples/*',
      '--filter',
      '!@auto-engineer/message-bus',
      '--filter',
      '!@auto-engineer/ai-gateway',
      '--concurrency=20',
    ],
    {
      stdio: 'inherit',
      shell: true,
    },
  );

  // Handle cleanup
  process.on('SIGINT', () => {
    log('Shutting down...');
    coreProcess.kill('SIGTERM');
    otherProcess.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    coreProcess.kill('SIGTERM');
    otherProcess.kill('SIGTERM');
    process.exit(0);
  });
}

main().catch(console.error);
