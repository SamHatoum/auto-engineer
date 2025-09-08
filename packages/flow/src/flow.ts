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
  recordShouldBlock,
  setSliceData,
  recordRule,
  recordExample,
  recordGivenData,
  recordAndGivenData,
  recordWhenData,
  recordThenData,
  recordAndThenData,
} from './flow-context';
import type { DataSinkItem, DataSourceItem, DataItem } from './types';
import createDebug from 'debug';

const debug = createDebug('flow:flow');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '6';
} // cyan

export function flow(name: string, fn: () => void): void;
export function flow(name: string, id: string, fn: () => void): void;
export function flow(name: string, idOrFn: string | (() => void), fn?: () => void): void {
  const id = typeof idOrFn === 'string' ? idOrFn : undefined;
  const callback = typeof idOrFn === 'function' ? idOrFn : fn!;

  debug('Starting flow definition: %s', name);
  const flowObj = startFlow(name, id);
  debug('Executing flow function for: %s', name);
  callback();
  debug('Flow function executed, registering flow: %s with %d slices', name, flowObj.slices.length);
  registry.register(flowObj);
  clearCurrentFlow();
  debug('Flow registered and context cleared: %s', name);
}

export const client = (fn: () => void) => {
  const slice = getCurrentSlice();
  if (slice) {
    startClientBlock(slice, '');
    fn();
    endClientBlock();
  }
};

export const server = (fn: () => void) => {
  const slice = getCurrentSlice();
  if (slice) {
    startServerBlock(slice, '');
    fn();
    endServerBlock();
  }
};

export const request = (_query: unknown) => ({
  with: (..._dependencies: unknown[]) => {},
});

export const should = (description: string) => {
  recordShouldBlock(description);
};

export const specs = (description: string, fn: () => void) => {
  pushSpec(description);
  recordShouldBlock();
  fn();
};

export function rule(description: string, fn: () => void): void;
export function rule(description: string, id: string, fn: () => void): void;
export function rule(description: string, idOrFn: string | (() => void), fn?: () => void): void {
  const id = typeof idOrFn === 'string' ? idOrFn : undefined;
  const callback = typeof idOrFn === 'function' ? idOrFn : fn!;

  recordRule(description, id);
  callback();
}

export const example = (description: string) => {
  recordExample(description);
  return createExampleBuilder();
};

// Type helpers to extract data and type names from Command/Event/State types
type ExtractData<T> = T extends { data: infer D } ? D : T;

interface TypedExampleBuilder {
  given<T>(data: ExtractData<T> | ExtractData<T>[]): TypedGivenBuilder<T>;
  when<W>(data: ExtractData<W> | ExtractData<W>[]): TypedWhenBuilder<W>;
}

interface TypedGivenBuilder<G> {
  and<U>(data: ExtractData<U> | ExtractData<U>[]): TypedGivenBuilder<G | U>;
  when<W>(data: ExtractData<W> | ExtractData<W>[]): TypedGivenWhenBuilder<G, W>;
}

interface TypedWhenBuilder<W> {
  then<T>(data: ExtractData<T> | ExtractData<T>[]): TypedThenBuilder<W, T>;
}

interface TypedGivenWhenBuilder<G, W> {
  then<T>(data: ExtractData<T> | ExtractData<T>[]): TypedGivenThenBuilder<G, W, T>;
}

interface TypedThenBuilder<W, T> {
  and<A>(data: ExtractData<A> | ExtractData<A>[]): TypedThenBuilder<W, T | A>;
}

interface TypedGivenThenBuilder<G, W, T> {
  and<A>(data: ExtractData<A> | ExtractData<A>[]): TypedGivenThenBuilder<G, W, T | A>;
}

function createThenBuilder<W, T>(): TypedThenBuilder<W, T> {
  return {
    and<A>(data: ExtractData<A> | ExtractData<A>[]): TypedThenBuilder<W, T | A> {
      const andItems = Array.isArray(data) ? data : [data];
      recordAndThenData(andItems);
      return createThenBuilder<W, T | A>();
    },
  };
}

function createGivenBuilder<G>(): TypedGivenBuilder<G> {
  return {
    and<U>(data: ExtractData<U> | ExtractData<U>[]): TypedGivenBuilder<G | U> {
      const andItems = Array.isArray(data) ? data : [data];
      recordAndGivenData(andItems);
      return createGivenBuilder<G | U>();
    },
    when<W>(data: ExtractData<W> | ExtractData<W>[]): TypedGivenWhenBuilder<G, W> {
      const whenData = Array.isArray(data) ? data : [data];
      recordWhenData(whenData.length === 1 ? whenData[0] : whenData);
      return {
        then<T>(data: ExtractData<T> | ExtractData<T>[]): TypedGivenThenBuilder<G, W, T> {
          const thenItems = Array.isArray(data) ? data : [data];
          recordThenData(thenItems);
          return {
            and<A>(data: ExtractData<A> | ExtractData<A>[]): TypedGivenThenBuilder<G, W, T | A> {
              const andItems = Array.isArray(data) ? data : [data];
              recordAndThenData(andItems);
              return createThenBuilder<W, T | A>() as TypedGivenThenBuilder<G, W, T | A>;
            },
          };
        },
      };
    },
  };
}

function createExampleBuilder(): TypedExampleBuilder {
  return {
    given<T>(data: ExtractData<T> | ExtractData<T>[]): TypedGivenBuilder<T> {
      const items = Array.isArray(data) ? data : [data];
      recordGivenData(items);
      return createGivenBuilder<T>();
    },
    when<W>(data: ExtractData<W> | ExtractData<W>[]): TypedWhenBuilder<W> {
      const whenData = Array.isArray(data) ? data : [data];
      recordWhenData(whenData.length === 1 ? whenData[0] : whenData);
      return {
        then<Z>(data: ExtractData<Z> | ExtractData<Z>[]): TypedThenBuilder<W, Z> {
          const thenItems = Array.isArray(data) ? data : [data];
          recordThenData(thenItems);
          return createThenBuilder<W, Z>();
        },
      };
    },
  };
}

export const SliceType = {
  COMMAND: 'command' as const,
  QUERY: 'query' as const,
  REACT: 'react' as const,
} as const;

export interface SliceTypeValueInterface {
  readonly value: 'command' | 'query' | 'react';
}

export interface CommandDataArray {
  readonly length: number;
  readonly __commandDataMarker?: never;
  [index: number]: DataSinkItem;
}
export interface QueryDataArray {
  readonly length: number;
  readonly __queryDataMarker?: never;
  [index: number]: DataSourceItem;
}
export interface ReactDataArray {
  readonly length: number;
  readonly __reactDataMarker?: never;
  [index: number]: DataItem;
}

export function data(items: DataItem[]): void {
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice for data configuration');

  const sliceType = slice.type;

  if (sliceType === SliceType.QUERY) {
    const hasSink = items.some((item) => '__type' in item && item.__type === 'sink');
    if (hasSink) {
      throw new Error('Query slices cannot have data sinks, only sources');
    }
  }

  setSliceData(items);
}
