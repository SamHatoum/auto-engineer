#!/usr/bin/env node
import 'dotenv/config';
import { createFlowCommandHandler, type CreateFlowCommand } from './index';

// Simple argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: cli.ts <prompt> [variant]');
  process.exit(1);
}

const prompt = args[0];
const variant = args[1] || 'flow-names';

// Clear screen and move cursor to top
console.clear();

const command: CreateFlowCommand = {
  type: 'CreateFlow',
  requestId: `req-${Date.now()}`,
  timestamp: new Date(),
  prompt,
  variant: variant as any,
  useStreaming: true,
  streamCallback: (partialData) => {
    // Move cursor to home position and clear screen
    // Move cursor to home position and clear screen
    process.stdout.write('\x1b[H\x1b[2J');
    
    // Output current state
    console.log('=== STREAMING OUTPUT ===\n');
    console.log(JSON.stringify(partialData, null, 2));
  }
};

// Execute the command
createFlowCommandHandler.handle(command)
  .then(response => {
    // Clear one more time and show final result
    // process.stdout.write('\x1b[H\x1b[2J');
    console.log('=== FINAL OUTPUT ===\n');
    console.log(JSON.stringify(response, null, 2));
  })
  .catch(error => {
    console.error('\n=== ERROR ===');
    console.error(error);
    process.exit(1);
  }); 