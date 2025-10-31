import crypto from 'node:crypto';
import { NodeFileStore } from '@auto-engineer/file-store/node';

export async function readBase64(vfs: NodeFileStore, abs: string): Promise<string | null> {
  const buf = await vfs.read(abs);
  if (!buf) {
    console.warn(`[sync] readBase64: missing file in VFS: ${abs}`);
    return null;
  }
  return Buffer.from(buf).toString('base64');
}

export async function md5(vfs: NodeFileStore, abs: string): Promise<string | null> {
  const buf = await vfs.read(abs);
  if (!buf) return null;
  return crypto.createHash('md5').update(buf).digest('hex');
}

export async function statSize(vfs: NodeFileStore, abs: string): Promise<number> {
  const buf = await vfs.read(abs);
  return buf ? buf.byteLength : 0;
}
