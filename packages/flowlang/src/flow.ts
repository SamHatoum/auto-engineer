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
} from './flow-context';
import type { DataSinkItem, DataSourceItem, DataItem } from './types';

export const flow = (name: string, fn: () => void) => {
  const flowObj = startFlow(name);
  fn();
  registry.register(flowObj);
  clearCurrentFlow();
};

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

export interface SliceTypes {
  command: 'command';
  query: 'query';
  react: 'react';
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

export interface DataArrayMap {
  command: CommandDataArray;
  query: QueryDataArray;
  react: ReactDataArray;
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