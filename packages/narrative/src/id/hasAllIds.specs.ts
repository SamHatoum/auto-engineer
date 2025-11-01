import { describe, expect, it, beforeEach } from 'vitest';
import { hasAllIds, addAutoIds } from './index';
import { getNarratives } from '../getNarratives';
import { InMemoryFileStore, type IFileStore } from '@auto-engineer/file-store';
import * as flowApi from '../narrative';
import * as fluent from '../fluent-builder';
import * as dataBuilders from '../data-narrative-builders';
import * as typesApi from '../types';
import gql from 'graphql-tag';

const importMap = {
  '../flow': flowApi,
  '../fluent-builder': fluent,
  '../data-flow-builders': dataBuilders,
  '../types': typesApi,
  'graphql-tag': gql,
};

describe('hasAllIds', () => {
  let vfs: IFileStore;
  const root = '/test';

  beforeEach(async () => {
    vfs = new InMemoryFileStore();

    const flowWithoutIds = `
import { flow, specs, rule, example } from '../narrative';
import { command } from '../fluent-builder';

flow('Test Flow Without IDs', () => {
  command('Test slice without ID')
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
import { flow, specs, rule, example } from '../narrative';
import { command } from '../fluent-builder';

flow('Test Flow with IDs', 'FLOW-001', () => {
  command('Test slice with ID', 'SLICE-001')
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

    const multipleFlowsSameSource = `
import { flow, specs, should } from '../narrative';
import { experience } from '../fluent-builder';

flow('Home Screen', 'AUTO-aifPcU3hw', () => {
  experience('Active Surveys Summary', 'AUTO-slice1').client(() => {
    specs(() => {
      should('show active surveys summary');
    });
  });
});

flow('Create Survey', 'AUTO-MPviTMrQC', () => {
  experience('Create Survey Form', 'AUTO-slice2').client(() => {
    specs(() => {
      should('allow entering survey title');
    });
  });
});

flow('Response Analytics', 'AUTO-eME978Euk', () => {
  experience('Response Rate Charts', 'AUTO-slice3').client(() => {
    specs(() => {
      should('show daily response rate charts');
    });
  });
});`;

    const multipleFlowsIncomplete = `
import { flow, specs, should } from '../narrative';
import { experience } from '../fluent-builder';

flow('Home Screen', 'AUTO-aifPcU3hw', () => {
  experience('Active Surveys Summary', 'AUTO-slice1').client(() => {
    specs(() => {
      should('show active surveys summary');
    });
  });
});

flow('Create Survey', () => {
  experience('Create Survey Form', 'AUTO-slice2').client(() => {
    specs(() => {
      should('allow entering survey title');
    });
  });
});

flow('Response Analytics', 'AUTO-eME978Euk', () => {
  experience('Response Rate Charts', 'AUTO-slice3').client(() => {
    specs(() => {
      should('show daily response rate charts');
    });
  });
});`;

    const multipleFlowsSliceMissing = `
import { flow, specs, should } from '../narrative';
import { experience } from '../fluent-builder';

flow('Home Screen', 'AUTO-aifPcU3hw', () => {
  experience('Active Surveys Summary', 'AUTO-slice1').client(() => {
    specs(() => {
      should('show active surveys summary');
    });
  });
});

flow('Create Survey', 'AUTO-MPviTMrQC', () => {
  experience('Create Survey Form').client(() => {
    specs(() => {
      should('allow entering survey title');
    });
  });
});

flow('Response Analytics', 'AUTO-eME978Euk', () => {
  experience('Response Rate Charts', 'AUTO-slice3').client(() => {
    specs(() => {
      should('show daily response rate charts');
    });
  });
});`;

    const flowContent1 = new TextEncoder().encode(flowWithoutIds);
    const flowContent2 = new TextEncoder().encode(flowWithIds);
    const flowContent3 = new TextEncoder().encode(multipleFlowsSameSource);
    const flowContent4 = new TextEncoder().encode(multipleFlowsIncomplete);
    const flowContent5 = new TextEncoder().encode(multipleFlowsSliceMissing);
    await vfs.write('/test/flow-without-ids.narrative.ts', flowContent1);
    await vfs.write('/test/flow-with-ids.narrative.ts', flowContent2);
    await vfs.write('/test/homepage.narrative.ts', flowContent3);
    await vfs.write('/test/homepage-incomplete.narrative.ts', flowContent4);
    await vfs.write('/test/homepage-slice-missing.narrative.ts', flowContent5);
  });
  it('should return false for models without IDs', async () => {
    const result = await getNarratives({ vfs, root, pattern: /\.(narrative)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const flowWithoutIds = model.narratives.find((f) => f.name === 'Test Flow Without IDs');
    expect(flowWithoutIds).toBeDefined();

    if (flowWithoutIds) {
      const modelWithoutIds = { ...model, narratives: [flowWithoutIds] };
      expect(hasAllIds(modelWithoutIds)).toBe(false);
    }
  });

  it('should return true for models with complete IDs', async () => {
    const result = await getNarratives({ vfs, root, pattern: /\.(narrative)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const modelWithIds = addAutoIds(model);
    expect(hasAllIds(modelWithIds)).toBe(true);
  });

  it('should return true for flows that already have IDs', async () => {
    const result = await getNarratives({ vfs, root, pattern: /\.(narrative)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const testFlowWithIds = model.narratives.find((f) => f.name === 'Test Flow with IDs');
    expect(testFlowWithIds).toBeDefined();

    if (testFlowWithIds) {
      const modelWithExistingIds = { ...model, narratives: [testFlowWithIds] };
      expect(hasAllIds(modelWithExistingIds)).toBe(true);
    }
  });

  it('should return false if any slice is missing an ID', async () => {
    const result = await getNarratives({ vfs, root, pattern: /\.(narrative)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const modelWithIds = addAutoIds(model);
    expect(modelWithIds.narratives.length).toBeGreaterThan(0);
    expect(modelWithIds.narratives[0].slices.length).toBeGreaterThan(0);

    const modifiedModel = structuredClone(modelWithIds);
    modifiedModel.narratives[0].slices[0].id = '';
    expect(hasAllIds(modifiedModel)).toBe(false);
  });

  it('should return false if any rule is missing an ID', async () => {
    const result = await getNarratives({ vfs, root, pattern: /\.(narrative)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const modelWithIds = addAutoIds(model);

    let found = false;
    for (const flow of modelWithIds.narratives) {
      for (const slice of flow.slices) {
        if ('server' in slice && slice.server?.specs?.rules !== undefined && slice.server.specs.rules.length > 0) {
          const modifiedModel = structuredClone(modelWithIds);
          const modifiedFlow = modifiedModel.narratives.find((f) => f.name === flow.name);
          const modifiedSlice = modifiedFlow?.slices.find((s) => s.name === slice.name);
          if (modifiedSlice && 'server' in modifiedSlice && modifiedSlice.server?.specs?.rules !== undefined) {
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

  it('should return true when multiple flows with same sourceFile all have IDs', async () => {
    const result = await getNarratives({ vfs, root, pattern: /\.(narrative)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const homepageFlows = model.narratives.filter(
      (f) => f.sourceFile !== undefined && f.sourceFile.includes('homepage.narrative.ts'),
    );
    expect(homepageFlows.length).toBe(3);

    const homepageModel = { ...model, narratives: homepageFlows };
    expect(hasAllIds(homepageModel)).toBe(true);
  });

  it('should return false when any flow in multiple flows with same sourceFile is missing ID', async () => {
    const result = await getNarratives({ vfs, root, pattern: /\.(narrative)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const homepageFlows = model.narratives.filter(
      (f) => f.sourceFile !== undefined && f.sourceFile.includes('homepage-incomplete.narrative.ts'),
    );
    expect(homepageFlows.length).toBe(3);

    const homepageModel = { ...model, narratives: homepageFlows };
    expect(hasAllIds(homepageModel)).toBe(false);
  });

  it('should return false when any slice in multiple flows with same sourceFile is missing ID', async () => {
    const result = await getNarratives({ vfs, root, pattern: /\.(narrative)\.(ts)$/, fastFsScan: true, importMap });
    const model = result.toModel();

    const homepageFlows = model.narratives.filter(
      (f) => f.sourceFile !== undefined && f.sourceFile.includes('homepage-slice-missing.narrative.ts'),
    );
    expect(homepageFlows.length).toBe(3);

    const homepageModel = { ...model, narratives: homepageFlows };
    expect(hasAllIds(homepageModel)).toBe(false);
  });
});
