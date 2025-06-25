import { registry } from './flow-registry';
import {
  startFlow,
  clearCurrentFlow,
  getCurrentSlice,
  startClientBlock,
  endClientBlock,
  startServerBlock,
  endServerBlock,
  pushSpec,
  startShouldBlock,
  endShouldBlock,
} from './flow-context';

export const flow = (name: string, fn: () => void) => {
  const ctx = startFlow(name);
  fn();
  registry.register(ctx);
  clearCurrentFlow();
};

export const client = (name: string, fn: () => void) => {
  const slice = getCurrentSlice();
  startClientBlock(slice, name);
  fn();
  endClientBlock();
};

export const server = (name: string, fn: () => void) => {
  const slice = getCurrentSlice();
  startServerBlock(slice, name);
  fn();
  endServerBlock();
};

export const request = (query: any) => ({
  with: (..._dependencies: any[]) => { }
});

function specs(name: string, fn: () => void): () => void;
function specs(fn: () => void): () => void;
function specs(nameOrFn: string | (() => void), fn?: () => void): () => void {
  const name = typeof nameOrFn === 'string' ? nameOrFn : undefined;
  const body = typeof nameOrFn === 'function' ? nameOrFn : fn;

  if (!body) return () => {};

  if (name) pushSpec(name);
  startShouldBlock();
  body();
  endShouldBlock();

  return () => {};
}
export { specs };

const shouldFn = (description: string) => {
  startShouldBlock(description);
  return {
    with: (..._dependencies: any[]) => { }
  };
};

shouldFn.not = (description: string) => ({
  with: (..._dependencies: any[]) => { }
});

export const should = shouldFn;