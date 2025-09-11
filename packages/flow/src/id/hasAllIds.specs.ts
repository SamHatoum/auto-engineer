import { describe, expect, it, beforeEach } from 'vitest';
import { hasAllIds, addAutoIds } from './index';
import { getFlows } from '../getFlows';
import { NodeFileStore } from '@auto-engineer/file-store';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe.skip('hasAllIds', () => {
  let vfs: NodeFileStore;
  let root: string;

  beforeEach(() => {
    vfs = new NodeFileStore();
    root = path.resolve(__dirname, '..');
  });
  it('should return false for models without IDs', async () => {
    const flows = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
    const model = flows.toModel();

    const flowsWithoutIds = model.flows.filter(
      (flow) =>
        flow.id === undefined ||
        flow.id === '' ||
        flow.slices.some((slice) => slice.id === undefined || slice.id === ''),
    );
    if (flowsWithoutIds.length > 0) {
      const modelWithoutIds = { ...model, flows: flowsWithoutIds };
      expect(hasAllIds(modelWithoutIds)).toBe(false);
    }
  });

  it('should return true for models with complete IDs', async () => {
    const flows = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
    const model = flows.toModel();

    const modelWithIds = addAutoIds(model);

    expect(hasAllIds(modelWithIds)).toBe(true);
  });

  it('should return true for flows that already have IDs', async () => {
    const flows = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
    const model = flows.toModel();

    const testFlowWithIds = model.flows.find((f) => f.name === 'Test Flow with IDs');

    if (testFlowWithIds) {
      const modelWithExistingIds = { ...model, flows: [testFlowWithIds] };
      expect(hasAllIds(modelWithExistingIds)).toBe(true);
    }
  });

  it('should return false if any slice is missing an ID', async () => {
    const flows = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
    const model = flows.toModel();

    const modelWithIds = addAutoIds(model);

    if (modelWithIds.flows.length > 0 && modelWithIds.flows[0].slices.length > 0) {
      const modifiedModel = structuredClone(modelWithIds);
      modifiedModel.flows[0].slices[0].id = '';
      expect(hasAllIds(modifiedModel)).toBe(false);
    }
  });

  it('should return false if any rule is missing an ID', async () => {
    const flows = await getFlows({ vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
    const model = flows.toModel();

    const modelWithIds = addAutoIds(model);
    for (const flow of modelWithIds.flows) {
      for (const slice of flow.slices) {
        if (slice.server?.specs?.rules !== undefined && slice.server.specs.rules.length > 0) {
          const modifiedModel = structuredClone(modelWithIds);
          const modifiedFlow = modifiedModel.flows.find((f) => f.name === flow.name);
          const modifiedSlice = modifiedFlow?.slices.find((s) => s.name === slice.name);
          if (modifiedSlice?.server?.specs?.rules !== undefined) {
            modifiedSlice.server.specs.rules[0].id = '';
            expect(hasAllIds(modifiedModel)).toBe(false);
            return;
          }
        }
      }
    }
  });
});
