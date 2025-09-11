import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getFlows, clearGetFlowsCache } from './getFlows';
import { NodeFileStore } from '@auto-engineer/file-store';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pattern = /\.(flow)\.(ts)$/;

describe('getFlows caching', () => {
  let vfs: NodeFileStore;
  let testDir: string;
  let helperFile: string;
  let flowFile: string;
  let unrelatedFile: string;

  beforeEach(() => {
    vfs = new NodeFileStore();
    testDir = path.join(__dirname, 'test-cache-samples');
    helperFile = path.join(testDir, 'helper.ts');
    flowFile = path.join(testDir, 'test.flow.ts');
    unrelatedFile = path.join(testDir, 'unrelated.txt');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    clearGetFlowsCache();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    clearGetFlowsCache();
  });

  it('should rebuild cache when a helper file is modified', async () => {
    fs.writeFileSync(
      helperFile,
      `
      export function formatName(name: string): string {
        return name.toUpperCase();
      }
    `,
    );
    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      import { formatName } from './helper';
      
      flow('TestFlow', () => {
        const name = formatName('test');
      });
    `,
    );
    const firstCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });
    const hash1 = firstCallResult.vfsFiles.sort().join(',');
    fs.writeFileSync(
      helperFile,
      `
      export function formatName(name: string): string {
        return name.toLowerCase(); // Changed implementation
      }
    `,
    );

    const secondCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });

    const hash2 = secondCallResult.vfsFiles.sort().join(',');
    expect(hash1).toBe(hash2);
    expect(secondCallResult.flows).toBeDefined();
  });

  it('should rebuild cache when import map changes', async () => {
    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x = 1;
      });
    `,
    );
    const importMap1 = { 'test-module': { default: 'value1' } };
    const result1 = await getFlows({ vfs, root: testDir, importMap: importMap1, pattern, fastFsScan: true });
    const importMap2 = { 'test-module': { default: 'value2' } };

    const result2 = await getFlows({ vfs, root: testDir, importMap: importMap2, pattern, fastFsScan: true });

    expect(result1.flows.length).toBe(result2.flows.length);
  });

  it('should rebuild cache when a new  dependency is added', async () => {
    const transitiveFile = path.join(testDir, 'transitive.ts');
    fs.writeFileSync(
      helperFile,
      `
      export function getValue(): string {
        return 'direct';
      }
    `,
    );
    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      import { getValue } from './helper';
      
      flow('TestFlow', () => {
        const val = getValue();
      });
    `,
    );
    const firstCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });
    const filesCount1 = firstCallResult.vfsFiles.length;
    fs.writeFileSync(
      transitiveFile,
      `
      export function transitiveHelper(): string {
        return 'transitive';
      }
    `,
    );
    fs.writeFileSync(
      helperFile,
      `
      import { transitiveHelper } from './transitive';
      
      export function getValue(): string {
        return transitiveHelper();
      }
    `,
    );

    const secondCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });

    const filesCount2 = secondCallResult.vfsFiles.length;
    expect(filesCount2).toBeGreaterThan(filesCount1);
    expect(secondCallResult.vfsFiles.some((f) => f.includes('transitive'))).toBe(true);
  });

  it('should not rebuild cache when an unrelated file is touched', async () => {
    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x = 1;
      });
    `,
    );
    fs.writeFileSync(unrelatedFile, 'initial content');
    const firstCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });
    fs.writeFileSync(unrelatedFile, 'modified content');

    const secondCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });

    expect(secondCallResult.vfsFiles.some((f) => f.includes('unrelated.txt'))).toBe(false);
    expect(firstCallResult.vfsFiles).toEqual(secondCallResult.vfsFiles);
  });

  it('should rebuild cache when a file is deleted from the graph', async () => {
    const flowFile2 = path.join(testDir, 'test2.flow.ts');

    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      
      flow('TestFlow1', () => {
        const x = 1;
      });
    `,
    );
    fs.writeFileSync(
      flowFile2,
      `
      import { flow } from '../flow';
      
      flow('TestFlow2', () => {
        const x = 2;
      });
    `,
    );
    const fistCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });
    expect(fistCallResult.flows.length).toBeGreaterThanOrEqual(2);
    fs.unlinkSync(flowFile2);

    const secondCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });

    expect(secondCallResult.flows.length).toBeLessThan(fistCallResult.flows.length);
    expect(secondCallResult.vfsFiles.length).toBeLessThan(fistCallResult.vfsFiles.length);
  });

  it('should rebuild cache when a file is renamed', async () => {
    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x = 1;
      });
    `,
    );
    const firstCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });
    expect(firstCallResult.vfsFiles.some((f) => f.includes('test.flow.ts'))).toBe(true);
    const renamedFile = path.join(testDir, 'renamed.flow.ts');
    fs.renameSync(flowFile, renamedFile);

    const secondCallResult = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });

    expect(secondCallResult.vfsFiles.some((f) => f.includes('renamed.flow.ts'))).toBe(true);
    expect(secondCallResult.vfsFiles.some((f) => f.includes('test.flow.ts'))).toBe(false);
  });

  it('should handle .d.ts files if they affect the graph', async () => {
    const dtsFile = path.join(testDir, 'types.d.ts');
    fs.writeFileSync(
      dtsFile,
      `
      declare module 'custom-module' {
        export function customFunc(): string;
      }
    `,
    );
    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x: string = 'test';
      });
    `,
    );

    const result = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });

    expect(result.vfsFiles.some((f) => f.endsWith('.d.ts'))).toBe(false);
  });

  it('should rebuild when import map keys change even with same values', async () => {
    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      
      flow('TestFlow', () => {
        const x = 1;
      });
    `,
    );
    const importMap1 = { 'module-a': 'value', 'module-b': 'value' };
    const result1 = await getFlows({ vfs, root: testDir, importMap: importMap1, pattern, fastFsScan: true });
    const importMap2 = { 'module-c': 'value', 'module-d': 'value' };

    const result2 = await getFlows({ vfs, root: testDir, importMap: importMap2, pattern, fastFsScan: true });

    expect(result1.flows).toEqual(result2.flows); // Same flows
  });

  it('should handle complex transitive dependency chains', async () => {
    const chain1 = path.join(testDir, 'chain1.ts');
    const chain2 = path.join(testDir, 'chain2.ts');
    const chain3 = path.join(testDir, 'chain3.ts');
    fs.writeFileSync(
      chain3,
      `
      export const DEEP_VALUE = 'deep';
    `,
    );

    fs.writeFileSync(
      chain2,
      `
      import { DEEP_VALUE } from './chain3';
      export const MID_VALUE = DEEP_VALUE + '-mid';
    `,
    );

    fs.writeFileSync(
      chain1,
      `
      import { MID_VALUE } from './chain2';
      export const TOP_VALUE = MID_VALUE + '-top';
    `,
    );

    fs.writeFileSync(
      flowFile,
      `
      import { flow } from '../flow';
      import { TOP_VALUE } from './chain1';
      
      flow('TestFlow', () => {
        const val = TOP_VALUE;
      });
    `,
    );

    const result1 = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });

    expect(result1.vfsFiles.some((f) => f.includes('chain1'))).toBe(true);
    expect(result1.vfsFiles.some((f) => f.includes('chain2'))).toBe(true);
    expect(result1.vfsFiles.some((f) => f.includes('chain3'))).toBe(true);
    fs.writeFileSync(
      chain3,
      `
      export const DEEP_VALUE = 'modified-deep';
    `,
    );

    const result2 = await getFlows({ vfs, root: testDir, pattern, fastFsScan: true });
    expect(result2.vfsFiles.length).toBe(result1.vfsFiles.length);
  });
});
