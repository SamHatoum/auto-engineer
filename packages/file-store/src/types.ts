export interface IFileStore {
  write(path: string, data: Uint8Array): Promise<void>;
  read(path: string): Promise<Uint8Array | null>;
  exists(path: string): Promise<boolean>;
  listTree(root?: string): Promise<Array<{ path: string; type: 'file' | 'dir'; size: number }>>;
  remove(path: string): Promise<void>;
}

export interface IExtendedFileStore extends IFileStore {
  ensureDir(path: string): Promise<void>;
  readdir(path: string): Promise<Array<{ name: string; type: 'file' | 'dir' }>>;
  readText(path: string): Promise<string | null>;
  writeText(path: string, text: string): Promise<void>;
  join(...parts: string[]): string;
  dirname(p: string): string;
  fromHere(relative: string, base?: string): string;
}
