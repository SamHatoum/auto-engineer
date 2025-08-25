// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createSnapshotVfs } from './snapshot';
import { walk, filterByRegex } from './index';

describe('SnapshotVfs', () => {
  it('should create and use SnapshotVfs correctly', async () => {
    const root = '/app';
    const files = {
      [`${root}/items.flow.ts`]: 'export const itemsFlow = "test";',
      [`${root}/order.flow.ts`]: 'export const orderFlow = "test";',
      [`${root}/user.integration.ts`]: 'export const userIntegration = "test";',
      [`${root}/other.ts`]: 'export const other = "test";',
    };

    const vfs = createSnapshotVfs(files, { preloadDirs: true });

    const content = await vfs.readFile(`${root}/items.flow.ts`);

    expect(content).toBe('export const itemsFlow = "test";');
    const dirContents = await vfs.readdir(root);
    expect(dirContents).toContain('items.flow.ts');
    expect(dirContents).toContain('order.flow.ts');
    expect(dirContents).toContain('user.integration.ts');
    expect(dirContents).toContain('other.ts');
    expect(await vfs.exists(`${root}/items.flow.ts`)).toBe(true);
    expect(await vfs.exists(`${root}/nonexistent.ts`)).toBe(false);
    const stat = await vfs.stat(`${root}/items.flow.ts`);
    expect(stat.isDirectory()).toBe(false);
    const dirStat = await vfs.stat(root);
    expect(dirStat.isDirectory()).toBe(true);
  });

  it('should walk directory tree and filter by regex', async () => {
    const root = '/app';
    const files = {
      [`${root}/items.flow.ts`]: 'flow file',
      [`${root}/order.flow.ts`]: 'flow file',
      [`${root}/user.integration.ts`]: 'integration file',
      [`${root}/other.ts`]: 'other file',
      [`${root}/nested/deep.flow.ts`]: 'nested flow',
    };
    const vfs = createSnapshotVfs(files, { preloadDirs: true });

    const allFiles = await walk(vfs, root);

    expect(allFiles).toHaveLength(5);
    expect(allFiles).toContain('/app/items.flow.ts');
    expect(allFiles).toContain('/app/order.flow.ts');
    expect(allFiles).toContain('/app/user.integration.ts');
    expect(allFiles).toContain('/app/other.ts');
    expect(allFiles).toContain('/app/nested/deep.flow.ts');
    const flowPattern = /\.(flow|integration)\.(ts|js|mjs)$/;
    const flowFiles = filterByRegex(allFiles, flowPattern);
    expect(flowFiles).toContain('/app/items.flow.ts');
    expect(flowFiles).toContain('/app/order.flow.ts');
    expect(flowFiles).toContain('/app/user.integration.ts');
    expect(flowFiles).toContain('/app/nested/deep.flow.ts');
    expect(flowFiles).not.toContain('/app/other.ts');
  });

  it('should handle writing and reading new files', async () => {
    const vfs = createSnapshotVfs({});
    await vfs.writeFile('/test.txt', 'hello world');

    const content = await vfs.readFile('/test.txt');

    expect(content).toBe('hello world');
    const files = await vfs.readdir('/');
    expect(files).toContain('test.txt');
  });
});
