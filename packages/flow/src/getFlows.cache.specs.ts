import { describe, expect, it, beforeEach } from 'vitest';
import { getFlows, clearGetFlowsCache } from './getFlows';
import { InMemoryFileStore, type IFileStore } from '@auto-engineer/file-store';
import * as flowApi from './flow';
import * as fluent from './fluent-builder';
import * as dataBuilders from './data-flow-builders';
import * as typesApi from './types';
import gql from 'graphql-tag';

const importMap = {
  '../flow': flowApi,
  '../fluent-builder': fluent,
  '../data-flow-builders': dataBuilders,
  '../types': typesApi,
  'graphql-tag': { default: gql, gql },
};

const pattern = /\.(flow)\.(ts)$/;

describe.sequential('getFlows caching', () => {
  let vfs: IFileStore;
  const root = '/test';

  beforeEach(() => {
    vfs = new InMemoryFileStore();
    clearGetFlowsCache();
  });

  it('should rebuild cache when a helper file is modified', async () => {
    const helperContent1 = `
      export function formatName(name: string): string {
        return name.toUpperCase();
      }
    `;
    const flowContent = `
      import { flow } from '../flow';
      import { formatName } from './helper';
      
      flow('TestFlow', () => {
        const name = formatName('test');
      });
    `;

    await vfs.write('/test/helper.ts', new TextEncoder().encode(helperContent1));
    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent));

    const firstCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });
    const hash1 = firstCallResult.vfsFiles.sort().join(',');

    const helperContent2 = `
      export function formatName(name: string): string {
        return name.toLowerCase(); // Changed implementation
      }
    `;
    await vfs.write('/test/helper.ts', new TextEncoder().encode(helperContent2));

    const secondCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });

    const hash2 = secondCallResult.vfsFiles.sort().join(',');
    expect(hash1).toBe(hash2);
    expect(secondCallResult.flows).toBeDefined();
  });

  it('should rebuild cache when import map changes', async () => {
    const flowContent = `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x = 1;
      });
    `;
    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent));

    const importMap1 = { 'test-module': { default: 'value1' } };
    const result1 = await getFlows({ vfs, root, importMap: importMap1, pattern, fastFsScan: true });
    const importMap2 = { 'test-module': { default: 'value2' } };

    const result2 = await getFlows({ vfs, root, importMap: importMap2, pattern, fastFsScan: true });

    expect(result1.flows.length).toBe(result2.flows.length);
  });

  it('should rebuild cache when a new dependency is added', async () => {
    const helperContent1 = `
      export function getValue(): string {
        return 'direct';
      }
    `;
    const flowContent = `
      import { flow } from '../flow';
      import { getValue } from './helper';
      
      flow('TestFlow', () => {
        const val = getValue();
      });
    `;

    await vfs.write('/test/helper.ts', new TextEncoder().encode(helperContent1));
    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent));

    const firstCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });
    const filesCount1 = firstCallResult.vfsFiles.length;

    const transitiveContent = `
      export function transitiveHelper(): string {
        return 'transitive';
      }
    `;
    const helperContent2 = `
      import { transitiveHelper } from './transitive';
      
      export function getValue(): string {
        return transitiveHelper();
      }
    `;

    await vfs.write('/test/transitive.ts', new TextEncoder().encode(transitiveContent));
    await vfs.write('/test/helper.ts', new TextEncoder().encode(helperContent2));

    const secondCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });

    const filesCount2 = secondCallResult.vfsFiles.length;
    expect(filesCount2).toBeGreaterThan(filesCount1);
    expect(secondCallResult.vfsFiles.some((f) => f.includes('transitive'))).toBe(true);
  });

  it('should not rebuild cache when an unrelated file is touched', async () => {
    const flowContent = `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x = 1;
      });
    `;

    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent));
    await vfs.write('/test/unrelated.txt', new TextEncoder().encode('initial content'));

    const firstCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });

    await vfs.write('/test/unrelated.txt', new TextEncoder().encode('modified content'));

    const secondCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });

    expect(secondCallResult.vfsFiles.some((f) => f.includes('unrelated.txt'))).toBe(false);
    expect(firstCallResult.vfsFiles).toEqual(secondCallResult.vfsFiles);
  });

  it('should rebuild cache when a file is deleted from the graph', async () => {
    const flowContent1 = `
      import { flow } from '../flow';
      
      flow('TestFlow1', () => {
        const x = 1;
      });
    `;
    const flowContent2 = `
      import { flow } from '../flow';
      
      flow('TestFlow2', () => {
        const x = 2;
      });
    `;

    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent1));
    await vfs.write('/test/test2.flow.ts', new TextEncoder().encode(flowContent2));

    const firstCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });
    expect(firstCallResult.flows.length).toBeGreaterThanOrEqual(2);

    await vfs.remove('/test/test2.flow.ts');

    const secondCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });

    expect(secondCallResult.flows.length).toBeLessThan(firstCallResult.flows.length);
    expect(secondCallResult.vfsFiles.length).toBeLessThan(firstCallResult.vfsFiles.length);
  });

  it('should rebuild cache when a file is renamed', async () => {
    const flowContent = `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x = 1;
      });
    `;

    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent));

    const firstCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });
    expect(firstCallResult.vfsFiles.some((f) => f.includes('test.flow.ts'))).toBe(true);

    const content = await vfs.read('/test/test.flow.ts');
    if (content) {
      await vfs.write('/test/renamed.flow.ts', content);
      await vfs.remove('/test/test.flow.ts');
    }

    const secondCallResult = await getFlows({ vfs, root, pattern, fastFsScan: true });

    expect(secondCallResult.vfsFiles.some((f) => f.includes('renamed.flow.ts'))).toBe(true);
    expect(secondCallResult.vfsFiles.some((f) => f.includes('test.flow.ts'))).toBe(false);
  });

  it('should handle .d.ts files if they affect the graph', async () => {
    const dtsContent = `
      declare module 'custom-module' {
        export function customFunc(): string;
      }
    `;
    const flowContent = `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x: string = 'test';
      });
    `;

    await vfs.write('/test/types.d.ts', new TextEncoder().encode(dtsContent));
    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent));

    const result = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });

    expect(result.vfsFiles.some((f) => f.endsWith('.d.ts'))).toBe(false);
  });

  it('should rebuild when import map keys change even with same values', async () => {
    const flowContent = `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x = 1;
      });
    `;

    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent));

    const importMap1 = { 'module-a': 'value', 'module-b': 'value' };
    const result1 = await getFlows({ vfs, root, importMap: importMap1, pattern, fastFsScan: true });
    const importMap2 = { 'module-c': 'value', 'module-d': 'value' };

    const result2 = await getFlows({ vfs, root, importMap: importMap2, pattern, fastFsScan: true });

    expect(result1.flows).toEqual(result2.flows); // Same flows
  });

  it('should handle complex transitive dependency chains', async () => {
    const chain3Content = `
      export const DEEP_VALUE = 'deep';
    `;
    const chain2Content = `
      import { DEEP_VALUE } from './chain3';
      export const MID_VALUE = DEEP_VALUE + '-mid';
    `;
    const chain1Content = `
      import { MID_VALUE } from './chain2';
      export const TOP_VALUE = MID_VALUE + '-top';
    `;
    const flowContent = `
      import { flow } from '../flow';
      import { TOP_VALUE } from './chain1';
      
      flow('TestFlow', () => {
        const val = TOP_VALUE;
      });
    `;

    await vfs.write('/test/chain3.ts', new TextEncoder().encode(chain3Content));
    await vfs.write('/test/chain2.ts', new TextEncoder().encode(chain2Content));
    await vfs.write('/test/chain1.ts', new TextEncoder().encode(chain1Content));
    await vfs.write('/test/test.flow.ts', new TextEncoder().encode(flowContent));

    const result1 = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });

    expect(result1.vfsFiles.some((f) => f.includes('chain1'))).toBe(true);
    expect(result1.vfsFiles.some((f) => f.includes('chain2'))).toBe(true);
    expect(result1.vfsFiles.some((f) => f.includes('chain3'))).toBe(true);

    const modifiedChain3Content = `
      export const DEEP_VALUE = 'modified-deep';
    `;
    await vfs.write('/test/chain3.ts', new TextEncoder().encode(modifiedChain3Content));

    const result2 = await getFlows({ vfs, root, pattern, fastFsScan: true, importMap });
    expect(result2.vfsFiles.length).toBe(result1.vfsFiles.length);
  });
});
