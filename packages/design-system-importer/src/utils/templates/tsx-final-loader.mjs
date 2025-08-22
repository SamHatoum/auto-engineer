import { register } from 'node:module';

// Register tsx for TypeScript support
register('tsx', import.meta.url);

// Import the TypeScript filter module
const filterModule = await import('__FILTER_PATH__');

// Export the filter function
export const filter = filterModule.filter || filterModule.default;