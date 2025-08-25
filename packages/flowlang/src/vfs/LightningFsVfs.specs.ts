import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LightningFsVfs } from './LightningFsVfs';

const resetIDBs = async () =>
  await new Promise<void>((res, rej) => {
    const dbs = ['flowfs-test', 'flowfs-complex-test'];
    let done = 0;
    for (const name of dbs) {
      const req = indexedDB.deleteDatabase(name);
      req.onerror = () => rej(req.error);
      req.onsuccess = () => {
        done += 1;
        if (done === dbs.length) res();
      };
    }
  });

beforeEach(async () => {
  await resetIDBs();
});

describe('LightningFS VFS (basic ops)', () => {
  it('writes and reads a file', async () => {
    const vfs = await LightningFsVfs.byName('flowfs-test');

    await vfs.writeFile('/test.txt', 'hello world', 'utf8');

    const content = await vfs.readFile('/test.txt', 'utf8');
    expect(content).toBe('hello world');
  });

  it('checks file existence', async () => {
    const vfs = await LightningFsVfs.byName('flowfs-test');

    await vfs.writeFile('/exists.txt', 'ok', 'utf8');

    expect(await vfs.exists('/exists.txt')).toBe(true);
    expect(await vfs.exists('/missing.txt')).toBe(false);
  });

  it('supports nested directories (mkdir -p style) for write/read', async () => {
    const vfs = await LightningFsVfs.byName('flowfs-test');
    await vfs.writeFile('/nested/deep/file.txt', 'nested content', 'utf8');

    const nested = await vfs.readFile('/nested/deep/file.txt', 'utf8');

    expect(nested).toBe('nested content');
  });

  it('lists directory contents', async () => {
    const vfs = await LightningFsVfs.byName('flowfs-test');
    await vfs.writeFile('/a.txt', 'a', 'utf8');
    await vfs.writeFile('/dir/b.txt', 'b', 'utf8');

    const rootFiles = await vfs.readdir('/');

    expect(rootFiles).toContain('a.txt');
    expect(rootFiles).toContain('dir');
    const dirFiles = await vfs.readdir('/dir');
    expect(dirFiles).toContain('b.txt');
  });

  it('returns correct stat info for files and directories', async () => {
    const vfs = await LightningFsVfs.byName('flowfs-test');
    await vfs.writeFile('/dir/file.txt', 'x', 'utf8');

    const fileStat = await vfs.stat('/dir/file.txt');

    expect(fileStat.isDirectory()).toBe(false);
    const dirStat = await vfs.stat('/dir');
    expect(dirStat.isDirectory()).toBe(true);
  });
});

describe('LightningFS VFS (complex structure)', () => {
  it('creates and verifies a multi-level project layout', async () => {
    const vfs = await LightningFsVfs.byName('flowfs-complex-test');

    await vfs.writeFile('/src/flows/items.flow.ts', 'items flow', 'utf8');
    await vfs.writeFile('/src/flows/orders.flow.ts', 'orders flow', 'utf8');
    await vfs.writeFile('/src/integrations/user.integration.ts', 'user integration', 'utf8');
    await vfs.writeFile('/config/settings.json', '{"key":"value"}', 'utf8');

    expect(await vfs.exists('/src/flows/items.flow.ts')).toBe(true);
    expect(await vfs.exists('/src/flows/orders.flow.ts')).toBe(true);
    expect(await vfs.exists('/src/integrations/user.integration.ts')).toBe(true);
    expect(await vfs.exists('/config/settings.json')).toBe(true);
    const srcContents = await vfs.readdir('/src');
    expect(srcContents).toContain('flows');
    expect(srcContents).toContain('integrations');
    const flowsContents = await vfs.readdir('/src/flows');
    expect(flowsContents).toContain('items.flow.ts');
    expect(flowsContents).toContain('orders.flow.ts');
    const itemsContent = await vfs.readFile('/src/flows/items.flow.ts', 'utf8');
    expect(itemsContent).toBe('items flow');
  });
});
