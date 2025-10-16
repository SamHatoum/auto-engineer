import { registry } from './narrative-registry';
import {
  startNarrative,
  clearCurrentNarrative,
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
} from './narrative-context';
import type { DataItem } from './types';
import createDebug from 'debug';

const debug = createDebug('auto:narrative:narrative');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '6';
} // cyan

export function narrative(name: string, fn: () => void): void;
export function narrative(name: string, id: string, fn: () => void): void;
export function narrative(name: string, idOrFn: string | (() => void), fn?: () => void): void {
  const id = typeof idOrFn === 'string' ? idOrFn : undefined;
  const callback = typeof idOrFn === 'function' ? idOrFn : fn!;

  debug('Starting narrative definition: %s', name);
  const narrativeObj = startNarrative(name, id);
  debug('Executing narrative function for: %s', name);
  callback();
  debug('Narrative function executed, registering narrative: %s with %d slices', name, narrativeObj.slices.length);
  registry.register(narrativeObj);
  clearCurrentNarrative();
  debug('Narrative registered and context cleared: %s', name);
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

export function specs(description: string, fn: () => void): void;
export function specs(fn: () => void): void;
export function specs(descriptionOrFn: string | (() => void), fn?: () => void): void {
  const description = typeof descriptionOrFn === 'string' ? descriptionOrFn : '';
  const callback = typeof descriptionOrFn === 'function' ? descriptionOrFn : fn!;

  pushSpec(description);
  recordShouldBlock();
  callback();
}

export function rule(description: string, fn: () => void): void;
export function rule(description: string, id: string, fn: () => void): void;
export function rule(description: string, idOrFn: string | (() => void), fn?: () => void): void {
  const id = typeof idOrFn === 'string' ? idOrFn : undefined;
  const callback = typeof idOrFn === 'function' ? idOrFn : fn;

  if (!callback) {
    throw new Error(`rule() requires a callback function. Got: ${typeof idOrFn}, ${typeof fn}`);
  }

  recordRule(description, id);
  callback();
}

export const example = (description: string): TypedExampleBuilder => {
  recordExample(description);
  return createExampleBuilder();
};

type ExtractData<T> = T extends { data: infer D } ? D : T;
type ContextFor<T> = Partial<Record<keyof ExtractData<T>, string>>;

function normalizeContext(context?: Partial<Record<string, string>>): Record<string, string> | undefined {
  if (!context) return undefined;

  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

interface TypedExampleBuilder {
  given<T>(data: ExtractData<T> | ExtractData<T>[], context?: ContextFor<T>): TypedGivenBuilder<T>;
  when<W>(data: ExtractData<W> | ExtractData<W>[], context?: ContextFor<W>): TypedWhenBuilder<W>;
}

interface TypedGivenBuilder<G> {
  and<U>(data: ExtractData<U> | ExtractData<U>[], context?: ContextFor<U>): TypedGivenBuilder<G | U>;
  when<W>(data: ExtractData<W> | ExtractData<W>[], context?: ContextFor<W>): TypedGivenWhenBuilder<G, W>;
  then<T>(data: ExtractData<T> | ExtractData<T>[], context?: ContextFor<T>): TypedGivenThenBuilder<G, never, T>;
}

interface TypedWhenBuilder<W> {
  then<T>(data: ExtractData<T> | ExtractData<T>[], context?: ContextFor<T>): TypedThenBuilder<W, T>;
}

interface TypedGivenWhenBuilder<G, W> {
  then<T>(data: ExtractData<T> | ExtractData<T>[], context?: ContextFor<T>): TypedGivenThenBuilder<G, W, T>;
}

interface TypedThenBuilder<W, T> {
  and<A>(data: ExtractData<A> | ExtractData<A>[], context?: ContextFor<A>): TypedThenBuilder<W, T | A>;
}

interface TypedGivenThenBuilder<G, W, T> {
  and<A>(data: ExtractData<A> | ExtractData<A>[], context?: ContextFor<A>): TypedGivenThenBuilder<G, W, T | A>;
}

function createThenBuilder<W, T>(): TypedThenBuilder<W, T> {
  return {
    and<A>(data: ExtractData<A> | ExtractData<A>[], context?: ContextFor<A>): TypedThenBuilder<W, T | A> {
      const andItems = Array.isArray(data) ? data : [data];
      recordAndThenData(andItems, normalizeContext(context as Partial<Record<string, string>>));
      return createThenBuilder<W, T | A>();
    },
  };
}

function createGivenBuilder<G>(): TypedGivenBuilder<G> {
  return {
    and<U>(data: ExtractData<U> | ExtractData<U>[], context?: ContextFor<U>): TypedGivenBuilder<G | U> {
      const andItems = Array.isArray(data) ? data : [data];
      recordAndGivenData(andItems, normalizeContext(context as Partial<Record<string, string>>));
      return createGivenBuilder<G | U>();
    },
    when<W>(data: ExtractData<W> | ExtractData<W>[], context?: ContextFor<W>): TypedGivenWhenBuilder<G, W> {
      const whenData = Array.isArray(data) ? data : [data];
      recordWhenData(
        whenData.length === 1 ? whenData[0] : whenData,
        normalizeContext(context as Partial<Record<string, string>>),
      );
      return {
        then<T>(data: ExtractData<T> | ExtractData<T>[], context?: ContextFor<T>): TypedGivenThenBuilder<G, W, T> {
          const thenItems = Array.isArray(data) ? data : [data];
          recordThenData(thenItems, normalizeContext(context as Partial<Record<string, string>>));
          return {
            and<A>(
              data: ExtractData<A> | ExtractData<A>[],
              context?: ContextFor<A>,
            ): TypedGivenThenBuilder<G, W, T | A> {
              const andItems = Array.isArray(data) ? data : [data];
              recordAndThenData(andItems, normalizeContext(context as Partial<Record<string, string>>));
              return createThenBuilder<W, T | A>() as TypedGivenThenBuilder<G, W, T | A>;
            },
          };
        },
      };
    },
    then<T>(data: ExtractData<T> | ExtractData<T>[], context?: ContextFor<T>): TypedGivenThenBuilder<G, never, T> {
      const thenItems = Array.isArray(data) ? data : [data];
      recordThenData(thenItems, normalizeContext(context as Partial<Record<string, string>>));
      return {
        and<A>(
          data: ExtractData<A> | ExtractData<A>[],
          context?: ContextFor<A>,
        ): TypedGivenThenBuilder<G, never, T | A> {
          const andItems = Array.isArray(data) ? data : [data];
          recordAndThenData(andItems, normalizeContext(context as Partial<Record<string, string>>));
          return createThenBuilder<never, T | A>() as TypedGivenThenBuilder<G, never, T | A>;
        },
      };
    },
  };
}

function createExampleBuilder(): TypedExampleBuilder {
  return {
    given<T>(data: ExtractData<T> | ExtractData<T>[], context?: ContextFor<T>): TypedGivenBuilder<T> {
      const items = Array.isArray(data) ? data : [data];
      recordGivenData(items, normalizeContext(context as Partial<Record<string, string>>));
      return createGivenBuilder<T>();
    },
    when<W>(data: ExtractData<W> | ExtractData<W>[], context?: ContextFor<W>): TypedWhenBuilder<W> {
      const whenData = Array.isArray(data) ? data : [data];
      recordWhenData(
        whenData.length === 1 ? whenData[0] : whenData,
        normalizeContext(context as Partial<Record<string, string>>),
      );
      return {
        then<Z>(data: ExtractData<Z> | ExtractData<Z>[], context?: ContextFor<Z>): TypedThenBuilder<W, Z> {
          const thenItems = Array.isArray(data) ? data : [data];
          recordThenData(thenItems, normalizeContext(context as Partial<Record<string, string>>));
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

export { narrative as flow };
