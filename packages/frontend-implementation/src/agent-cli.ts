#!/usr/bin/env tsx
import { runAIAgent } from './agent';

const [, , projectDir, iaSchemeDir] = process.argv;

if (!projectDir) {
  console.error('Usage: agent-cli <project-directory> <ia-scheme-directory>');
  process.exit(1);
}

runAIAgent(projectDir, iaSchemeDir).catch((err) => {
  console.error('Error running AI agent:', err);
  process.exit(1);
});
