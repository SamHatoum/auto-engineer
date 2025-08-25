import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeVfs } from './NodeVfs';

describe('NodeVfs (basic filesystem ops)', () => {
  let root: string;
  let vfs: NodeVfs;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'nodevfs-'));
    vfs = new NodeVfs();
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes and reads a file', async () => {
    const p = join(root, 'test.txt');
    await vfs.writeFile(p, 'hello world', 'utf8');

    const content = await vfs.readFile(p, 'utf8');

    expect(content).toBe('hello world');
  });

  it('checks file existence', async () => {
    const existsPath = join(root, 'exists.txt');
    const missingPath = join(root, 'missing.txt');

    await vfs.writeFile(existsPath, 'ok', 'utf8');

    expect(await vfs.exists(existsPath)).toBe(true);
    expect(await vfs.exists(missingPath)).toBe(false);
  });

  it('supports nested directories (mkdir -p style) for write/read', async () => {
    const nested = join(root, 'nested/deep/file.txt');

    await vfs.writeFile(nested, 'nested content', 'utf8');

    const content = await vfs.readFile(nested, 'utf8');
    expect(content).toBe('nested content');
  });

  it('lists directory contents', async () => {
    const a = join(root, 'a.txt');
    const dir = join(root, 'dir');
    const b = join(dir, 'b.txt');

    await vfs.writeFile(a, 'a', 'utf8');
    await vfs.writeFile(b, 'b', 'utf8');

    const rootFiles = await vfs.readdir(root);
    expect(rootFiles).toEqual(expect.arrayContaining(['a.txt', 'dir']));
    const dirFiles = await vfs.readdir(dir);
    expect(dirFiles).toEqual(expect.arrayContaining(['b.txt']));
  });

  it('returns correct stat info for files and directories', async () => {
    const d = join(root, 'stats');
    const f = join(d, 'file.txt');

    await vfs.writeFile(f, 'x', 'utf8');

    const fileStat = await vfs.stat(f);
    expect(fileStat.isDirectory()).toBe(false);
    const dirStat = await vfs.stat(d);
    expect(dirStat.isDirectory()).toBe(true);
  });

  it('throws on stat for non-existent path', async () => {
    const nope = join(root, 'does-not-exist.txt');

    await expect(vfs.stat(nope)).rejects.toBeTruthy();
  });
});
