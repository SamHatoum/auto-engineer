#!/usr/bin/env node
import { startServer, isServerStarted } from '@auto-engineer/ai-gateway';
import './product-catalogue-integration.js';

// npx tsx server/src/integrations/start-mcp-server.ts
async function main() {
  console.log('🚀 Starting MCP Server for Shopping Assistant...');
  
  if (isServerStarted()) {
    console.error('Server is already running!');
    return;
  }
  
  try {
    await startServer();
    console.log('✅ MCP Server started successfully!');
    console.log('📦 Available tools:');
    console.log('   - PRODUCT_CATALOGUE_PRODUCTS: Get all products');
    console.log('   - PRODUCT_CATALOGUE_PRODUCTS_BY_CATEGORY: Get products by category');
    console.log('   - PRODUCT_CATALOGUE_SEARCH: Search products');
    console.log('   - PRODUCT_CATALOGUE_PRODUCT_DETAILS: Get product details');
    console.log('\n🔌 The server is now running on stdio and ready to accept connections.');
    
    process.stdin.resume();
    
    const shutdown = () => {
      console.log('\n\n👋 Shutting down MCP Server...');
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('❌ Failed to start MCP Server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
}); 