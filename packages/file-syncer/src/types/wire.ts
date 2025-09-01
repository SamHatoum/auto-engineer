export type FileEvent = 'add' | 'change' | 'delete';

export type WireChange = {
  event: FileEvent;
  path: string; // posix wire path relative to project root, prefixed with '/'
  content?: string; // base64 when event = add/change
};

export type WireInitial = {
  files: Array<{ path: string; content: string }>;
  directory: string;
};
