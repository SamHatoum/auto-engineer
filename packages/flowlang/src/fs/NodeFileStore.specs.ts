import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeFileStore } from './NodeFileStore';
import { toPosix } from './path';

const enc = new TextEncoder();
const dec = new TextDecoder();

describe('NodeFileStore', () => {
  let root: string;
  let fs: NodeFileStore;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'nodefilestore-'));
    fs = new NodeFileStore();
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes and reads a file (binary API)', async () => {
    const p = join(root, 'test.txt');

    await fs.write(p, enc.encode('hello world'));
    const buf = await fs.read(p);
    expect(buf).not.toBeNull();
    expect(dec.decode(buf!)).toBe('hello world');
  });

  it('checks file existence', async () => {
    const existsPath = join(root, 'exists.txt');
    const missingPath = join(root, 'missing.txt');

    await fs.write(existsPath, enc.encode('ok'));
    expect(await fs.read(missingPath)).toBeNull();

    expect(await fs.exists(existsPath)).toBe(true);
    expect(await fs.exists(missingPath)).toBe(false);
  });

  it('supports nested directories (mkdir -p style) for write/read', async () => {
    const nested = join(root, 'nested/deep/file.txt');

    await fs.write(nested, enc.encode('nested content'));

    const buf = await fs.read(nested);
    expect(buf).not.toBeNull();
    expect(dec.decode(buf!)).toBe('nested content');
  });

  it('lists directory tree', async () => {
    const a = join(root, 'a.txt');
    const dir = join(root, 'dir');
    const b = join(dir, 'b.txt');

    await fs.write(a, enc.encode('a'));
    await fs.write(b, enc.encode('b'));

    const tree = await fs.listTree(root);
    const paths = new Set(tree.map((e) => e.path));

    // expect both directory and files to be present (POSIX paths)
    expect(paths.has(toPosix(root))).toBe(true);
    expect(paths.has(toPosix(a))).toBe(true);
    expect(paths.has(toPosix(dir))).toBe(true);
    expect(paths.has(toPosix(b))).toBe(true);

    const fileEntry = tree.find((e) => e.path === toPosix(b));
    const dirEntry = tree.find((e) => e.path === toPosix(dir));

    expect(fileEntry?.type).toBe('file');
    expect(dirEntry?.type).toBe('dir');
    expect(typeof fileEntry?.size).toBe('number');
  });

  it('non-existent file yields read() = null and exists() = false', async () => {
    const nope = join(root, 'does-not-exist.txt');
    expect(await fs.read(nope)).toBeNull();
    expect(await fs.exists(nope)).toBe(false);
  });
});
