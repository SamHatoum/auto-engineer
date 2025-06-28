#!/usr/bin/env tsx
import 'dotenv/config';
import { createFlowCommandHandler, type CreateFlowCommand, type FlowData } from './index';

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function log(message: string, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(title: string) {
  console.log('');
  log('═'.repeat(80), colors.cyan);
  log(` ${title}`, colors.bright + colors.cyan);
  log('═'.repeat(80), colors.cyan);
  console.log('');
}

function logSection(title: string) {
  log(`\n${'─'.repeat(60)}`, colors.gray);
  log(`${title}`, colors.yellow);
  log('─'.repeat(60), colors.gray);
}

async function demonstrateNonStreaming() {
  logHeader('🔄 NON-STREAMING STRUCTURED DATA GENERATION');
  
  const command: CreateFlowCommand = {
    requestId: 'cli-test-001',
    prompt: 'Create a task management system with the ability to create, assign, and complete tasks',
    useStreaming: false
  };

  log('📝 Prompt:', colors.blue);
  log(`   "${command.prompt}"`, colors.gray);
  console.log('');

  try {
    log('⏳ Generating structured data...', colors.yellow);
    const startTime = Date.now();
    
    const result = await createFlowCommandHandler.handle(command);
    
    const duration = Date.now() - startTime;
    
    if (result.status === 'ack') {
      log(`✅ Success! (${duration}ms)`, colors.green);
      log(`📋 Result: ${result.message}`, colors.green);
    } else {
      log(`❌ Error: ${result.error}`, colors.red);
    }
    
  } catch (error) {
    log(`💥 Exception: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
  }
}

async function demonstrateStreaming() {
  logHeader('🌊 STREAMING STRUCTURED DATA GENERATION');
  
  let updateCount = 0;
  const streamCallback = (partialData: Partial<FlowData>) => {
    updateCount++;
    logSection(`📡 Streaming Update #${updateCount}`);
    
    if (partialData.name) {
      log(`   📝 Flow Name: ${partialData.name}`, colors.cyan);
    }
    
    if (partialData.description) {
      log(`   📖 Description: ${partialData.description}`, colors.blue);
    }
    
    if (partialData.slices) {
      log(`   🔧 Slices: ${partialData.slices.length} slice(s)`, colors.magenta);
      partialData.slices.forEach((slice, index) => {
        log(`      ${index + 1}. ${slice.name} (${slice.type})`, colors.gray);
      });
    }
    
    if (partialData.flowImplementation) {
      const lines = partialData.flowImplementation.split('\n').length;
      log(`   💻 Implementation: ${lines} lines, ${partialData.flowImplementation.length} characters`, colors.green);
    }
    
    if (partialData.fileStructure) {
      log(`   📁 Directory: ${partialData.fileStructure.directory}`, colors.yellow);
      log(`   📄 Main File: ${partialData.fileStructure.mainFlowFile}`, colors.yellow);
    }
  };

  const command: CreateFlowCommand = {
    requestId: 'cli-test-002',
    prompt: 'Create an e-commerce order processing system with inventory management',
    useStreaming: true,
    streamCallback
  };

  log('📝 Prompt:', colors.blue);
  log(`   "${command.prompt}"`, colors.gray);
  console.log('');

  try {
    log('⏳ Starting streaming generation...', colors.yellow);
    const startTime = Date.now();
    
    const result = await createFlowCommandHandler.handle(command);
    
    const duration = Date.now() - startTime;
    
    logSection('🏁 Final Result');
    
    if (result.status === 'ack') {
      log(`✅ Streaming completed successfully! (${duration}ms)`, colors.green);
      log(`📋 Final message: ${result.message}`, colors.green);
      log(`📊 Total streaming updates: ${updateCount}`, colors.cyan);
    } else {
      log(`❌ Error: ${result.error}`, colors.red);
    }
    
  } catch (error) {
    log(`💥 Exception: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
  }
}

async function displayCompleteFlowStructure() {
  logHeader('🏗️ COMPLETE FLOW STRUCTURE EXAMPLE');
  
  // Example of what a complete flow structure looks like
  const exampleFlowData: FlowData = {
    name: 'E-commerce Order Processing',
    description: 'Complete order processing system with inventory and payment handling',
    slices: [
      {
        type: 'command',
        name: 'Create Order',
        description: 'Process customer order creation',
        files: {
          events: `export type OrderCreated = Event<'OrderCreated', {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;
  createdAt: Date;
}>;`,
          commands: `export type CreateOrder = Command<'CreateOrder', {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
}, {
  now: Date;
  userId: string;
}>;`,
          state: `export type Order = {
  id: string;
  customerId: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  items: Array<OrderItem>;
  totalAmount: number;
  createdAt: Date;
};`
        }
      },
      {
        type: 'react',
        name: 'Update Inventory',
        description: 'Automatically update inventory when order is created',
        files: {
          events: `export type InventoryUpdated = Event<'InventoryUpdated', {
  productId: string;
  quantityReserved: number;
  availableQuantity: number;
  updatedAt: Date;
}>;`,
          commands: `export type UpdateInventory = Command<'UpdateInventory', {
  productId: string;
  quantityToReserve: number;
}>;`
        }
      },
      {
        type: 'query',
        name: 'Get Order Status',
        description: 'Query order information and status',
        files: {
          state: `export type OrderView = {
  orderId: string;
  customerName: string;
  status: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  estimatedDelivery?: Date;
};`
        }
      }
    ],
    flowImplementation: `flow('E-commerce Order Processing', () => {
  commandSlice('Create Order')
    .stream('order-\${orderId}')
    .client('Order Form', () => {
      specs(() => {
        should('validate customer information');
        should('check item availability');
        should('calculate total amount');
      });
    })
    .server('Order Processing', () => {
      specs('Customer can create order with valid items', () => {
        when(Commands.CreateOrder({ 
          customerId: 'cust-123', 
          items: [{ productId: 'prod-456', quantity: 2 }] 
        }))
          .then([Events.OrderCreated({ 
            orderId: 'order-789', 
            customerId: 'cust-123',
            totalAmount: 99.98 
          })]);
      });
    });

  reactSlice('Update Inventory')
    .server('Inventory Management', () => {
      specs('Reserve inventory when order is created', () => {
        when([Events.OrderCreated({ orderId: 'order-789' })])
          .then([Commands.UpdateInventory({ productId: 'prod-456', quantityToReserve: 2 })]);
      });
    });

  querySlice('Get Order Status')
    .request(gql\`
      query GetOrderStatus($orderId: String!) {
        order(id: $orderId) {
          id
          status
          customer { name }
          items {
            product { name }
            quantity
            price
          }
          totalAmount
          estimatedDelivery
        }
      }
    \`)
    .server('Order Projection', () => {
      specs('Project order data for queries', () => {
        when(Events.OrderCreated({ orderId: 'order-789' }))
          .then([State.OrderView({ orderId: 'order-789', status: 'pending' })]);
      });
    });
});`,
    fileStructure: {
      mainFlowFile: 'e-commerce-order-processing.flow.ts',
      directory: '/flows/e-commerce/'
    }
  };

  // Display the structure in a beautiful format
  log(`📝 Flow Name: ${exampleFlowData.name}`, colors.bright + colors.cyan);
  log(`📖 Description: ${exampleFlowData.description}`, colors.blue);
  log(`📁 Directory: ${exampleFlowData.fileStructure.directory}`, colors.yellow);
  log(`📄 Main File: ${exampleFlowData.fileStructure.mainFlowFile}`, colors.yellow);
  
  logSection('🔧 SLICES BREAKDOWN');
  exampleFlowData.slices.forEach((slice, index) => {
    log(`\n${index + 1}. ${slice.name} (${slice.type.toUpperCase()})`, colors.bright + colors.magenta);
    log(`   📖 ${slice.description}`, colors.gray);
    
    if (slice.files.events) {
      log(`   📋 Events:`, colors.green);
      log(`${slice.files.events.split('\n').slice(0, 3).map(line => `      ${line}`).join('\n')}...`, colors.gray);
    }
    
    if (slice.files.commands) {
      log(`   ⚡ Commands:`, colors.yellow);
      log(`${slice.files.commands.split('\n').slice(0, 3).map(line => `      ${line}`).join('\n')}...`, colors.gray);
    }
    
    if (slice.files.state) {
      log(`   💾 State:`, colors.cyan);
      log(`${slice.files.state.split('\n').slice(0, 3).map(line => `      ${line}`).join('\n')}...`, colors.gray);
    }
  });

  logSection('💻 FLOWLANG DSL IMPLEMENTATION');
  log(exampleFlowData.flowImplementation, colors.white);
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'all';

  log('🚀 FlowLang Agent CLI Test Tool', colors.bright + colors.green);
  log('═'.repeat(40), colors.green);
  
  try {
    switch (mode) {
      case 'streaming':
      case 's':
        await demonstrateStreaming();
        break;
        
      case 'non-streaming':
      case 'n':
        await demonstrateNonStreaming();
        break;
        
      case 'structure':
      case 'st':
        await displayCompleteFlowStructure();
        break;
        
      case 'all':
      default:
        await demonstrateNonStreaming();
        await demonstrateStreaming();
        await displayCompleteFlowStructure();
        break;
    }
    
    logHeader('✅ CLI Test Completed Successfully');
    log('Available modes:', colors.cyan);
    log('  • npm run cli-test           (run all demonstrations)', colors.gray);
    log('  • npm run cli-test streaming (streaming only)', colors.gray);
    log('  • npm run cli-test n         (non-streaming only)', colors.gray);
    log('  • npm run cli-test structure (structure display only)', colors.gray);
    
  } catch (error) {
    logHeader('❌ CLI Test Failed');
    log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, colors.red);
    process.exit(1);
  }
}

// Run the CLI test
main().catch(console.error); 