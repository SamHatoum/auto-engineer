import type { IFileStore } from '@auto-engineer/file-store/node';

export type Resolved =
  | { kind: 'vfs'; path: string }
  | { kind: 'mapped'; value: unknown }
  | { kind: 'external'; spec: string };

export type ModuleCode = {
  js: string; // transpiled CJS
  imports: string[]; // literal specifiers
  resolved: Map<string, Resolved>; // spec -> resolved (decided during build)
};

export type Graph = Map<string, ModuleCode>;

export type ExecuteOptions = {
  entryFiles: string[];
  vfs: IFileStore;
  importMap?: Record<string, unknown>;
};
