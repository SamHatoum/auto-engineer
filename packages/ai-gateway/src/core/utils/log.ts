export type Logger = (...args: unknown[]) => void;

type DebugFactory = (ns: string) => Logger;

interface ProcessVersions {
  node?: string;
}
interface NodeProcess {
  versions?: ProcessVersions;
}

let debugFactory: DebugFactory | null | undefined = undefined;
let debugPromise: Promise<void> | null = null;

function isNodeEnvironment(): boolean {
  if (typeof process === 'undefined') return false;
  const proc = process as NodeProcess;
  return Boolean(proc.versions?.node);
}

function loadDebug(): Promise<void> {
  if (!isNodeEnvironment()) {
    debugFactory = null; // permanent no-op on edge
    return Promise.resolve();
  }
  if (debugPromise) return debugPromise;

  debugPromise = import('debug')
    .then((mod) => {
      const imported = mod as { default?: DebugFactory } | DebugFactory;
      debugFactory = typeof imported === 'function' ? imported : (imported.default ?? null);
    })
    .catch(() => {
      debugFactory = null;
    });

  return debugPromise;
}

export function makeLogger(ns: string): Logger {
  const queue: unknown[][] = [];
  let impl: Logger | null = null;
  const MAX_BUFFERED = 100;

  const logger: Logger = (...args: unknown[]) => {
    if (impl) {
      impl(...args);
    } else if (queue.length < MAX_BUFFERED) {
      queue.push(args);
    }
  };

  void loadDebug().then(() => {
    try {
      impl = debugFactory ? debugFactory(ns) : () => {};
    } catch {
      impl = () => {};
    }
    // flush any buffered logs
    for (const args of queue) impl(...args);
    queue.length = 0;
  });

  return logger;
}
