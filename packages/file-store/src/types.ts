export interface IFileStore {
  write(path: string, data: Uint8Array): Promise<void>;
  read(path: string): Promise<Uint8Array | null>;
  exists(path: string): Promise<boolean>;
  listTree(root?: string): Promise<Array<{ path: string; type: 'file' | 'dir'; size: number }>>;
  remove(path: string): Promise<void>;
}

export type ChangeKind = 'created' | 'updated' | 'deleted';
