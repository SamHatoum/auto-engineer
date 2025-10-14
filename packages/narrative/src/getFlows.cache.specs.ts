import { describe, expect, it, beforeEach } from 'vitest';
import { getNarratives, clearGetNarrativesCache } from './getNarratives';
import { InMemoryFileStore, type IFileStore } from '@auto-engineer/file-store';
import * as flowApi from './narrative';
import * as fluent from './fluent-builder';
import * as dataBuilders from './data-narrative-builders';
import * as typesApi from './types';
import gql from 'graphql-tag';

const importMap = {
  '../flow': flowApi,
  '../fluent-builder': fluent,
  '../data-flow-builders': dataBuilders,
  '../types': typesApi,
  'graphql-tag': { default: gql, gql },
};

const pattern = /\.(narrative)\.(ts)$/;

describe('getNarratives caching', () => {
  let vfs: IFileStore;
  const root = '/test';

  beforeEach(() => {
    vfs = new InMemoryFileStore();
    clearGetNarrativesCache();
  });

  it('should rebuild cache when a helper file is modified', async () => {
    const helperContent1 = `
      export function formatName(name: string): string {
        return name.toUpperCase();
      }
    `;
    const flowContent = `
      import { narrative } from '../narrative';
      import { formatName } from './helper';
      
      narrative('TestFlow', () => {
        const name = formatName('test');
      });
    `;

    await vfs.write('/test/helper.ts', new TextEncoder().encode(helperContent1));
    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent));

    const firstCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });
    const hash1 = firstCallResult.vfsFiles.sort().join(',');

    const helperContent2 = `
      export function formatName(name: string): string {
        return name.toLowerCase(); // Changed implementation
      }
    `;
    await vfs.write('/test/helper.ts', new TextEncoder().encode(helperContent2));

    const secondCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });

    const hash2 = secondCallResult.vfsFiles.sort().join(',');
    expect(hash1).toBe(hash2);
    expect(secondCallResult.narratives).toBeDefined();
  });

  it('should rebuild cache when import map changes', async () => {
    const flowContent = `
      import { narrative } from '../narrative';
      
      narrative('TestFlow', () => {
        const x = 1;
      });
    `;
    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent));

    const importMap1 = { 'test-module': { default: 'value1' } };
    const result1 = await getNarratives({ vfs, root, importMap: importMap1, pattern, fastFsScan: true });
    const importMap2 = { 'test-module': { default: 'value2' } };

    const result2 = await getNarratives({ vfs, root, importMap: importMap2, pattern, fastFsScan: true });

    expect(result1.narratives.length).toBe(result2.narratives.length);
  });

  it('should rebuild cache when a new dependency is added', async () => {
    const helperContent1 = `
      export function getValue(): string {
        return 'direct';
      }
    `;
    const flowContent = `
      import { narrative } from '../narrative';
      import { getValue } from './helper';
      
      narrative('TestFlow', () => {
        const val = getValue();
      });
    `;

    await vfs.write('/test/helper.ts', new TextEncoder().encode(helperContent1));
    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent));

    const firstCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });
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

    const secondCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });

    const filesCount2 = secondCallResult.vfsFiles.length;
    expect(filesCount2).toBeGreaterThan(filesCount1);
    expect(secondCallResult.vfsFiles.some((f) => f.includes('transitive'))).toBe(true);
  });

  it('should not rebuild cache when an unrelated file is touched', async () => {
    const flowContent = `
      import { narrative } from '../narrative';
      
      narrative('TestFlow', () => {
        const x = 1;
      });
    `;

    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent));
    await vfs.write('/test/unrelated.txt', new TextEncoder().encode('initial content'));

    const firstCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });

    await vfs.write('/test/unrelated.txt', new TextEncoder().encode('modified content'));

    const secondCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });

    expect(secondCallResult.vfsFiles.some((f) => f.includes('unrelated.txt'))).toBe(false);
    expect(firstCallResult.vfsFiles).toEqual(secondCallResult.vfsFiles);
  });

  it('should rebuild cache when a file is deleted from the graph', async () => {
    const flowContent1 = `
      import { narrative } from '../narrative';
      
      narrative('TestFlow1', () => {
        const x = 1;
      });
    `;
    const flowContent2 = `
      import { narrative } from '../narrative';
      
      narrative('TestFlow2', () => {
        const x = 2;
      });
    `;

    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent1));
    await vfs.write('/test/test2.narrative.ts', new TextEncoder().encode(flowContent2));

    const firstCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });
    expect(firstCallResult.narratives.length).toBeGreaterThanOrEqual(2);

    await vfs.remove('/test/test2.narrative.ts');

    const secondCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });

    expect(secondCallResult.narratives.length).toBeLessThan(firstCallResult.narratives.length);
    expect(secondCallResult.vfsFiles.length).toBeLessThan(firstCallResult.vfsFiles.length);
  });

  it('should rebuild cache when a file is renamed', async () => {
    const flowContent = `
      import { narrative } from '../narrative';
      
      narrative('TestFlow', () => {
        const x = 1;
      });
    `;

    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent));

    const firstCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });
    expect(firstCallResult.vfsFiles.some((f) => f.includes('test.narrative.ts'))).toBe(true);

    const content = await vfs.read('/test/test.narrative.ts');
    if (content) {
      await vfs.write('/test/renamed.narrative.ts', content);
      await vfs.remove('/test/test.narrative.ts');
    }

    const secondCallResult = await getNarratives({ vfs, root, pattern, fastFsScan: true });

    expect(secondCallResult.vfsFiles.some((f) => f.includes('renamed.narrative.ts'))).toBe(true);
    expect(secondCallResult.vfsFiles.some((f) => f.includes('test.narrative.ts'))).toBe(false);
  });

  it('should handle .d.ts files if they affect the graph', async () => {
    const dtsContent = `
      declare module 'custom-module' {
        export function customFunc(): string;
      }
    `;
    const flowContent = `
      import { narrative } from '../narrative';
      
      narrative('TestFlow', () => {
        const x: string = 'test';
      });
    `;

    await vfs.write('/test/types.d.ts', new TextEncoder().encode(dtsContent));
    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent));

    const result = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });

    expect(result.vfsFiles.some((f) => f.endsWith('.d.ts'))).toBe(false);
  });

  it('should rebuild when import map keys change even with same values', async () => {
    const flowContent = `
      import { narrative } from '../narrative';
      
      narrative('TestFlow', () => {
        const x = 1;
      });
    `;

    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent));

    const importMap1 = { 'module-a': 'value', 'module-b': 'value' };
    const result1 = await getNarratives({ vfs, root, importMap: importMap1, pattern, fastFsScan: true });
    const importMap2 = { 'module-c': 'value', 'module-d': 'value' };

    const result2 = await getNarratives({ vfs, root, importMap: importMap2, pattern, fastFsScan: true });

    expect(result1.narratives).toEqual(result2.narratives); // Same flows
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
      import { narrative } from '../narrative';
      import { TOP_VALUE } from './chain1';
      
      narrative('TestFlow', () => {
        const val = TOP_VALUE;
      });
    `;

    await vfs.write('/test/chain3.ts', new TextEncoder().encode(chain3Content));
    await vfs.write('/test/chain2.ts', new TextEncoder().encode(chain2Content));
    await vfs.write('/test/chain1.ts', new TextEncoder().encode(chain1Content));
    await vfs.write('/test/test.narrative.ts', new TextEncoder().encode(flowContent));

    const result1 = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });

    expect(result1.vfsFiles.some((f) => f.includes('chain1'))).toBe(true);
    expect(result1.vfsFiles.some((f) => f.includes('chain2'))).toBe(true);
    expect(result1.vfsFiles.some((f) => f.includes('chain3'))).toBe(true);

    const modifiedChain3Content = `
      export const DEEP_VALUE = 'modified-deep';
    `;
    await vfs.write('/test/chain3.ts', new TextEncoder().encode(modifiedChain3Content));

    const result2 = await getNarratives({ vfs, root, pattern, fastFsScan: true, importMap });
    expect(result2.vfsFiles.length).toBe(result1.vfsFiles.length);
  });
});
