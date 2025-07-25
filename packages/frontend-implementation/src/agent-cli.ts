#!/usr/bin/env tsx
import { runAIAgent } from './agent';

const [, , projectDir, iaSchemeDir, userPreferencesPath, designSystemPath] = process.argv;

if (!projectDir) {
  console.error('Usage: agent-cli <project-directory> <ia-scheme-directory>');
  process.exit(1);
}

runAIAgent(projectDir, iaSchemeDir, userPreferencesPath, designSystemPath).catch((err) => {
  console.error('Error running AI agent:', err);
  process.exit(1);
});
