import { flow } from '../flow';
import { commandSlice, querySlice, reactSlice } from '../fluent-builder';

flow('Test Flow with IDs', 'FLOW-001', () => {
  commandSlice('Create test item', 'SLICE-001')
    .client(() => {})
    .server(() => {});

  querySlice('Get test items', 'SLICE-002')
    .client(() => {})
    .server(() => {});

  reactSlice('React to test event', 'SLICE-003').server(() => {});
});
