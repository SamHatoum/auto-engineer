// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LightningFileStore } from './LightningFileStore';

const te = new TextEncoder();
const td = new TextDecoder();

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

describe('LightningFS FileStore (basic ops)', () => {
  it('writes and reads a file', async () => {
    const fs = new LightningFileStore('flowfs-test');

    await fs.write('/test.txt', te.encode('hello world'));
    const buf = await fs.read('/test.txt');

    expect(buf).not.toBeNull();
    expect(td.decode(buf!)).toBe('hello world');
  });

  it('checks file existence', async () => {
    const fs = new LightningFileStore('flowfs-test');

    await fs.write('/exists.txt', te.encode('ok'));

    expect(await fs.exists('/exists.txt')).toBe(true);
    expect(await fs.exists('/missing.txt')).toBe(false);
  });

  it('supports nested directories (mkdir -p style) for write/read', async () => {
    const fs = new LightningFileStore('flowfs-test');

    await fs.write('/nested/deep/file.txt', te.encode('nested content'));
    const buf = await fs.read('/nested/deep/file.txt');

    expect(buf).not.toBeNull();
    expect(td.decode(buf!)).toBe('nested content');
  });

  it('lists directory contents via listTree()', async () => {
    const fs = new LightningFileStore('flowfs-test');

    await fs.write('/a.txt', te.encode('a'));
    await fs.write('/dir/b.txt', te.encode('b'));

    const tree = await fs.listTree('/');

    const paths = tree.map((e) => e.path).sort();
    expect(paths).toContain('/');
    expect(paths).toContain('/a.txt');
    expect(paths).toContain('/dir');
    expect(paths).toContain('/dir/b.txt');

    const root = tree.find((e) => e.path === '/');
    const dir = tree.find((e) => e.path === '/dir');
    const file = tree.find((e) => e.path === '/a.txt');

    expect(root?.type).toBe('dir');
    expect(dir?.type).toBe('dir');
    expect(file?.type).toBe('file');
  });
});

describe('LightningFS FileStore (complex structure)', () => {
  it('creates and verifies a multi-level project layout', async () => {
    const fs = new LightningFileStore('flowfs-complex-test');

    await fs.write('/src/flows/items.flow.ts', te.encode('items flow'));
    await fs.write('/src/flows/orders.flow.ts', te.encode('orders flow'));
    await fs.write('/src/integrations/user.integration.ts', te.encode('user integration'));
    await fs.write('/config/settings.json', te.encode('{"key":"value"}'));

    expect(await fs.exists('/src/flows/items.flow.ts')).toBe(true);
    expect(await fs.exists('/src/flows/orders.flow.ts')).toBe(true);
    expect(await fs.exists('/src/integrations/user.integration.ts')).toBe(true);
    expect(await fs.exists('/config/settings.json')).toBe(true);

    const tree = await fs.listTree('/src');
    const paths = tree.map((e) => e.path);

    expect(paths).toContain('/src');
    expect(paths).toContain('/src/flows');
    expect(paths).toContain('/src/integrations');
    expect(paths).toContain('/src/flows/items.flow.ts');
    expect(paths).toContain('/src/flows/orders.flow.ts');

    // verify content
    const itemsBuf = await fs.read('/src/flows/items.flow.ts');
    expect(itemsBuf).not.toBeNull();
    expect(td.decode(itemsBuf!)).toBe('items flow');
  });
});
