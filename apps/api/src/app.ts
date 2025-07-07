import '@auto-engineer/config';
import { MessageBus } from '@auto-engineer/message-bus';
import { createFlowCommandHandler, CreateFlowCommand } from '@auto-engineer/flowlang-agent';

const messageBus = new MessageBus();

messageBus.registerCommandHandler(createFlowCommandHandler);

export const app = {
  messageBus,
}

// Test the message bus
const testMessageBus = async () => {
  console.clear();
  console.log('=== Testing Message Bus ===\n');
  
  const isFlowVariant = (value: string): value is NonNullable<CreateFlowCommand['variant']> => {
    return ['flow-names', 'slice-names', 'client-server-names', 'specs'].includes(value);
  }

  const variantValue = process.argv[3] || 'flow-names';
  if (!isFlowVariant(variantValue)) {
      throw new Error(`Invalid variant: ${variantValue}`);
  }

  const command: CreateFlowCommand = {
    type: 'CreateFlow',
    requestId: `req-${Date.now()}`,
    timestamp: new Date(),
    prompt: process.argv[2] || 'Create a simple todo flow',
    variant: variantValue,
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
  })().catch((err) => {
    console.error('Unhandled error in test:', err);
    process.exit(1);
  });
}
