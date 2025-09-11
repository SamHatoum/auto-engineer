import { describe, expect, it, beforeEach } from 'vitest';
import { hasAllIds, addAutoIds } from './index';
import { getFlows } from '../getFlows';
import { InMemoryFileStore, type IFileStore } from '@auto-engineer/file-store';
import * as flowApi from '../flow';
import * as fluent from '../fluent-builder';
import * as dataBuilders from '../data-flow-builders';
import * as typesApi from '../types';
import gql from 'graphql-tag';

const importMap = {
  '../flow': flowApi,
  '../fluent-builder': fluent,
  '../data-flow-builders': dataBuilders,
  '../types': typesApi,
  'graphql-tag': gql,
};

describe.sequential('hasAllIds', () => {
  let vfs: IFileStore;
  const root = '/test';

  beforeEach(async () => {
    vfs = new InMemoryFileStore();

    const flowWithoutIds = `
import { flow, specs, rule, example } from '../flow';
import { commandSlice } from '../fluent-builder';

flow('Test Flow Without IDs', () => {
  commandSlice('Test slice without ID')
    .server(() => {
      specs('Test specs', () => {
        rule('Test rule without ID', () => {
          example('Test example')
            .when({ test: 'data' })
            .then({ result: 'success' });
        });
      });
    });
});`;

    const flowWithIds = `
import { flow, specs, rule, example } from '../flow';
import { commandSlice } from '../fluent-builder';

flow('Test Flow with IDs', 'FLOW-001', () => {
  commandSlice('Test slice with ID', 'SLICE-001')
    .server(() => {
      specs('Test specs', () => {
        rule('Test rule with ID', 'RULE-001', () => {
          example('Test example')
            .when({ test: 'data' })
            .then({ result: 'success' });
        });
      });
    });
});`;

    const flowContent1 = new TextEncoder().encode(flowWithoutIds);
    const flowContent2 = new TextEncoder().encode(flowWithIds);
    await vfs.write('/test/flow-without-ids.flow.ts', flowContent1);
    await vfs.write('/test/flow-with-ids.flow.ts', flowContent2);
  });
  it('should return false for models without IDs', async () => {
    const result = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const flowWithoutIds = model.flows.find((f) => f.name === 'Test Flow Without IDs');
    expect(flowWithoutIds).toBeDefined();

    if (flowWithoutIds) {
      const modelWithoutIds = { ...model, flows: [flowWithoutIds] };
      expect(hasAllIds(modelWithoutIds)).toBe(false);
    }
  });

  it('should return true for models with complete IDs', async () => {
    const result = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const modelWithIds = addAutoIds(model);
    expect(hasAllIds(modelWithIds)).toBe(true);
  });

  it('should return true for flows that already have IDs', async () => {
    const result = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const testFlowWithIds = model.flows.find((f) => f.name === 'Test Flow with IDs');
    expect(testFlowWithIds).toBeDefined();

    if (testFlowWithIds) {
      const modelWithExistingIds = { ...model, flows: [testFlowWithIds] };
      expect(hasAllIds(modelWithExistingIds)).toBe(true);
    }
  });

  it('should return false if any slice is missing an ID', async () => {
    const result = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const modelWithIds = addAutoIds(model);
    expect(modelWithIds.flows.length).toBeGreaterThan(0);
    expect(modelWithIds.flows[0].slices.length).toBeGreaterThan(0);

    const modifiedModel = structuredClone(modelWithIds);
    modifiedModel.flows[0].slices[0].id = '';
    expect(hasAllIds(modifiedModel)).toBe(false);
  });

  it('should return false if any rule is missing an ID', async () => {
    const result = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const modelWithIds = addAutoIds(model);

    let found = false;
    for (const flow of modelWithIds.flows) {
      for (const slice of flow.slices) {
        if (slice.server?.specs?.rules !== undefined && slice.server.specs.rules.length > 0) {
          const modifiedModel = structuredClone(modelWithIds);
          const modifiedFlow = modifiedModel.flows.find((f) => f.name === flow.name);
          const modifiedSlice = modifiedFlow?.slices.find((s) => s.name === slice.name);
          if (modifiedSlice?.server?.specs?.rules !== undefined) {
            modifiedSlice.server.specs.rules[0].id = '';
            expect(hasAllIds(modifiedModel)).toBe(false);
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }

    expect(found).toBe(true);
  });
});
