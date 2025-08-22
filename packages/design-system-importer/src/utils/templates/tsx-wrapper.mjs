#!/usr/bin/env node
// This script tests if the filter can be loaded and executed
import('__FILTER_PATH__').then(module => {
  const filter = module.filter || module.default;
  if (typeof filter === 'function') {
    // Test it works
    filter({ name: 'test', type: 'COMPONENT', children: [] });
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});