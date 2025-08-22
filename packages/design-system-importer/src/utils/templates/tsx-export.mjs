// This script exports the filter function as JSON for serialization
import * as filterModule from '__FILTER_PATH__';

const filter = filterModule.filter || filterModule.default;

if (typeof filter === 'function') {
  // Output the filter as a module we can import
  console.log(JSON.stringify({
    success: true,
    filterCode: filter.toString()
  }));
} else {
  console.log(JSON.stringify({
    success: false,
    error: 'No filter function found'
  }));
}