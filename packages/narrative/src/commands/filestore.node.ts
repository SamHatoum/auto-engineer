import type { IExtendedFileStore } from '@auto-engineer/file-store/node';

let fsPromise: Promise<IExtendedFileStore> | null = null;
export async function getFs(): Promise<IExtendedFileStore> {
  if (!fsPromise) {
    fsPromise = (async () => {
      const { NodeFileStore } = await import('@auto-engineer/file-store/node');
      return new NodeFileStore() as IExtendedFileStore;
    })();
  }
  return fsPromise;
}
