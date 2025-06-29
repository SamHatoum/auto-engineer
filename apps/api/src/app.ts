import '@auto-engineer/config';
import { MessageBus } from '@auto-engineer/message-bus';
import { createFlowCommandHandler, CreateFlowCommand, FlowCreatedEvent } from '@auto-engineer/flowlang-agent';

const messageBus = new MessageBus();

messageBus.registerCommandHandler(createFlowCommandHandler);

export const app = {
  messageBus,
}

// Test the message bus
const testMessageBus = async () => {
  console.clear();
  console.log('=== Testing Message Bus ===\n');
  
  const command: CreateFlowCommand = {
    type: 'CreateFlow',
    requestId: `req-${Date.now()}`,
    timestamp: new Date(),
    prompt: process.argv[2] || 'Create a simple todo flow',
    variant: (process.argv[3] || 'flow-names') as any,
    useStreaming: true,
    streamCallback: (partialData) => {
      // Clear screen and show streaming output
      process.stdout.write('\x1b[H\x1b[2J');
      console.log('=== STREAMING OUTPUT ===\n');
      console.log(JSON.stringify(partialData, null, 2));
    }
  };

  try {
    // Send command through message bus
    const response = await messageBus.sendCommand(command);
    
    // Clear and show final result
    console.log('\n=== FINAL RESPONSE ===\n');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
    process.exit(1);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  (async () => {
    await testMessageBus();
  })();
}
