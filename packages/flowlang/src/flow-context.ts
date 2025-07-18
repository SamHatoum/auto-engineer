import type {DataSinkItem, DataSourceItem, DataItem, DataSink, DataSource} from './types';
import {Flow, Slice} from "./index";

interface FlowContext {
  flow: Flow;
  currentSliceIndex: number | null;
  currentSpecTarget: 'client' | 'server' | null;
  currentSpecIndex: number | null;
}

let context: FlowContext | null = null;

export function startFlow(name: string): Flow {
  const flow: Flow = {
    name,
    slices: []
  };
  context = {
    flow,
    currentSliceIndex: null,
    currentSpecTarget: null,
    currentSpecIndex: null
  };
  return flow;
}

export function getCurrentFlow(): Flow | null {
  return context?.flow ?? null;
}

export function clearCurrentFlow(): void {
  context = null;
}

export function getCurrentSlice(): Slice | null {
  if (!context || context.currentSliceIndex === null) return null;
  return context.flow.slices[context.currentSliceIndex] ?? null;
}

export function addSlice(slice: Slice): void {
  if (!context) throw new Error('No active flow');
  context.flow.slices.push(slice);
  context.currentSliceIndex = context.flow.slices.length - 1;
}

export function startClientBlock(description: string = ''): void {
  if (!context) throw new Error('No active flow context');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  if (slice.type === 'command' || slice.type === 'query') {
    slice.client = {
      description,
      specs: []
    };
    context.currentSpecTarget = 'client';
  }
}

export function endClientBlock(): void {
  if (context) {
    context.currentSpecTarget = null;
  }
}

export function startServerBlock(description: string = ''): void {
  if (!context) throw new Error('No active flow context');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  if (slice.type === 'command') {
    slice.server = {
      description,
      gwt: [],
      data: undefined
    };
  } else if (slice.type === 'query') {
    slice.server = {
      description,
      gwt: [],
      data: undefined
    };
  } else if (slice.type === 'react') {
    slice.server = {
      description,
      gwt: [],
      data: undefined
    };
  }

  context.currentSpecTarget = 'server';
}

export function endServerBlock(): void {
  if (context) {
    context.currentSpecTarget = null;
  }
}

export function pushSpec(description: string): void {
  if (!context || !context.currentSpecTarget) throw new Error('No active spec target');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  if (context.currentSpecTarget === 'client' && (slice.type === 'command' || slice.type === 'query')) {
    slice.client.specs.push(description);
  }
}

export function startShouldBlock(description?: string): void {
  if ((description != null) && context?.currentSpecTarget === 'client') {
    const slice = getCurrentSlice();
    if (slice && (slice.type === 'command' || slice.type === 'query')) {
      slice.client.specs.push(description);
    }
  }
}

export function endShouldBlock(): void {
  // No-op for compatibility
}

export function startGwtSpec(): void {
  if (!context || !context.currentSpecTarget) throw new Error('No active spec target');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  if (context.currentSpecTarget === 'server') {
    // Initialize a new GWT spec based on slice type
    if (slice.type === 'command') {
      slice.server.gwt.push({
        when: { commandRef: '', exampleData: {} },
        then: []
      });
    } else if (slice.type === 'query') {
      slice.server.gwt.push({
        given: [],
        then: []
      });
    } else if (slice.type === 'react') {
      slice.server.gwt.push({
        when: [],
        then: []
      });
    }
    context.currentSpecIndex = slice.server.gwt.length - 1;
  }
}

export function recordGiven(events: Array<{ type: string; data: Record<string, unknown> }>): void {
  if (!context || context.currentSpecIndex === null) throw new Error('No active GWT spec');
  const slice = getCurrentSlice();
  if (!slice || slice.type !== 'command') throw new Error('Given can only be used in command slices');

  const spec = slice.server.gwt[context.currentSpecIndex];
  if ('given' in spec) {
    spec.given = events.map(event => ({
      eventRef: event.type,
      exampleData: event.data
    }));
  }
}

export function recordWhen(command: { type: string; data: Record<string, unknown> }): void {
  if (!context || context.currentSpecIndex === null) throw new Error('No active GWT spec');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  if (slice.type === 'command') {
    const spec = slice.server.gwt[context.currentSpecIndex];
    spec.when = {
      commandRef: command.type,
      exampleData: command.data
    };
  } else if (slice.type === 'react') {
    // For react slices, when is an array of events
    const spec = slice.server.gwt[context.currentSpecIndex];
    spec.when = [{
      eventRef: command.type,
      exampleData: command.data
    }];
  }
}

export function recordWhenEvents(events: Array<{ type: string; data: Record<string, unknown> }>): void {
  if (!context || context.currentSpecIndex === null) throw new Error('No active GWT spec');
  const slice = getCurrentSlice();
  if (!slice || slice.type !== 'react') throw new Error('When events can only be used in react slices');

  const spec = slice.server.gwt[context.currentSpecIndex];
  spec.when = events.map(event => ({
    eventRef: event.type,
    exampleData: event.data
  }));
}

export function recordThen(...items: Array<{ type: string; data: Record<string, unknown> }>): void {
  if (!context || context.currentSpecIndex === null) throw new Error('No active GWT spec');
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  if (slice.type === 'command') {
    const spec = slice.server.gwt[context.currentSpecIndex];
    spec.then = items.map(item => ({
      eventRef: item.type,
      exampleData: item.data
    }));
  } else if (slice.type === 'query') {
    const spec = slice.server.gwt[context.currentSpecIndex];
    spec.then = items.map(item => ({
      stateRef: item.type,
      exampleData: item.data
    }));
  } else if (slice.type === 'react') {
    const spec = slice.server.gwt[context.currentSpecIndex];
    spec.then = items.map(item => ({
      commandRef: item.type,
      exampleData: item.data
    }));
  }
}

export function setQueryRequest(request: string): void {
  const slice = getCurrentSlice();
  if (!slice || slice.type !== 'query') throw new Error('Request can only be set on query slices');
  slice.request = request;
}

export function setSliceData(data: DataItem[]): void {
  const slice = getCurrentSlice();
  if (!slice) throw new Error('No active slice');

  if (slice.server === undefined) {
    throw new Error('Data can only be set in server block');
  }

  // Separate sinks and sources
  const sinks = data.filter((item): item is DataSinkItem => item.__type === 'sink');
  const sources = data.filter((item): item is DataSourceItem => item.__type === 'source');

  if (slice.type === 'command') {
    // Command slices only have sinks in their data
    slice.server.data = sinks.length > 0 ? sinks : undefined;
  } else if (slice.type === 'query') {
    // Query slices only have sources in their data
    slice.server.data = sources.length > 0 ? sources : undefined;
  } else if (slice.type === 'react') {
    slice.server.data =
        data.length > 0 ? stripTypeDiscriminator(data) : undefined;
  }
}

function stripTypeDiscriminator(
    items: DataItem[]
): (DataSink | DataSource)[] {
  return items.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __type, ...rest } = item;
    return rest as DataSink | DataSource;
  });
}