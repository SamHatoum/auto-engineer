#!/usr/bin/env tsx
import { runAIAgent } from "./agent";

const [, , projectDir] = process.argv;

if (!projectDir) {
  console.error("Usage: agent-cli <project-directory>");
  process.exit(1);
}

runAIAgent(projectDir).catch(err => {
  console.error("Error running AI agent:", err);
  process.exit(1);
}); 