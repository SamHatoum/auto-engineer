import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// Try to find and register tsx
try {
  // First try to find tsx in the project's node_modules
  const require = createRequire(import.meta.url);
  let tsxPath;
  
  try {
    // Try to resolve tsx from the current working directory
    tsxPath = require.resolve('tsx/esm/api', { paths: [process.cwd()] });
  } catch {
    try {
      // Try alternative path for tsx v3
      tsxPath = require.resolve('tsx/esm', { paths: [process.cwd()] });
    } catch {
      // Try to find tsx anywhere
      tsxPath = require.resolve('tsx');
    }
  }
  
  // Import tsx and register it
  const tsx = await import(tsxPath);
  if (tsx.register) {
    tsx.register();
  }
} catch (e) {
  // If we can't find tsx's register, try using node's experimental loader
  try {
    register('tsx', pathToFileURL('./'));
  } catch {
    console.error('Could not register tsx loader:', e);
  }
}

// Now import the TypeScript filter file
// __FILTER_PATH__ will be replaced with the actual path
const filterModule = await import('__FILTER_PATH__');
const filter = filterModule.filter || filterModule.default;

if (typeof filter !== 'function') {
  throw new Error('No filter function found in TypeScript file');
}

// Export it so we can use it
export { filter };