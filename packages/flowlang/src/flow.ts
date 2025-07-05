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
import type { DataSink, DataSource, DataSinkItem, DataSourceItem, DataItem } from './types';

export const flow = (name: string, fn: () => void) => {
  const ctx = startFlow(name);
  fn();
  registry.register(ctx);
  clearCurrentFlow();
};

export const client = (fn: () => void) => {
  const slice = getCurrentSlice();
  startClientBlock(slice, '');
  fn();
  endClientBlock();
};

export const server = (fn: () => void) => {
  const slice = getCurrentSlice();
  startServerBlock(slice, '');
  fn();
  endServerBlock();
};

export const request = (query: any) => ({
  with: (..._dependencies: any[]) => { }
});

export const should = (description: string) => {
  startShouldBlock(description);
};

export const specs = (description: string, fn: () => void) => {
  pushSpec(description);
  startShouldBlock();
  fn();
  endShouldBlock();
};

export type SliceType = 'command' | 'query' | 'react';

export type DataArray<T extends SliceType = SliceType> = 
  T extends 'command' ? DataSinkItem[] :
  T extends 'query' ? DataSourceItem[] :
  T extends 'react' ? DataItem[] :
  never;

export function data<T extends SliceType>(items: DataArray<T>): void;
export function data(items: DataItem[]): void {
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice for data configuration');
  if (!slice.server) throw new Error('data() can only be called within a server block');
  
  const sliceType = slice.type as SliceType;
  
  // Validate items based on slice type
  if (sliceType === 'command') {
    const hasSource = items.some(item => '__type' in item && item.__type === 'source');
    if (hasSource) {
      throw new Error('Command slices cannot have data sources, only sinks');
    }
  }
  
  if (sliceType === 'query') {
    const hasSink = items.some(item => '__type' in item && item.__type === 'sink');
    if (hasSink) {
      throw new Error('Query slices cannot have data sinks, only sources');
    }
  }
  
  // Store the data items
  slice.server.data = items;
}