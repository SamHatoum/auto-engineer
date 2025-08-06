#!/usr/bin/env node
import { createMessageBus } from '@auto-engineer/message-bus';
import {
  createExampleCommandHandler,
  handleCreateExampleCommand,
  type CreateExampleCommand,
} from '../commands/create-example';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle case where first arg is the command name itself
  let exampleName: string | undefined;
  if (args.length >= 2 && args[0] === 'create-auto-example') {
    exampleName = args[1];
  } else if (args.length >= 1 && args[0] !== '--help' && args[0] !== '-h') {
    exampleName = args[0];
  }

  if (!exampleName || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: npx @auto-engineer/flowlang <example-name>');
    console.log('   or: create-auto-example <example-name>');
    console.log('');
    console.log('Available examples:');
    console.log('  shopping-assistant');
    console.log('');
    console.log('This command will create example files in the current directory.');
    process.exit(0);
  }

  const targetDirectory = process.cwd();

  const messageBus = createMessageBus();
  messageBus.registerCommandHandler(createExampleCommandHandler);

  const command: CreateExampleCommand = {
    type: 'CreateExample',
    data: {
      exampleName,
      targetDirectory,
    },
    timestamp: new Date(),
    requestId: `create-example-${Date.now()}`,
  };

  try {
    const result = await handleCreateExampleCommand(command);

    if (result.type === 'ExampleCreated') {
      console.log(`✅ Example "${exampleName}" created successfully!`);
      console.log('');
      console.log('Files created:');
      result.data.filesCreated.forEach((file: string) => {
        console.log(`  - ${file}`);
      });
      console.log('');
      console.log('Next steps:');
      console.log('1. Review the generated files');
      console.log('2. Install dependencies: npm install');
      console.log('3. Start development: npm run dev');
    } else {
      console.error(`❌ Failed to create example: ${result.data.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error creating example:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
