import type { FlowSchema } from './flow-registry';

let currentFlow: FlowSchema | null = null;
let currentSpecTarget: 'client' | 'server' | null = null;
let currentShouldList: string[] | null = null;

export function startFlow(name: string): FlowSchema {
    currentFlow = { name, slices: [] };
    return currentFlow;
}

export function getCurrentFlow(): FlowSchema {
    if (!currentFlow) throw new Error('No active flow');
    return currentFlow;
}

export function clearCurrentFlow(): void {
    currentFlow = null;
}

export function getCurrentSlice(): any {
    const flow = getCurrentFlow();
    if (flow.slices.length === 0) {
        const newSlice = { type: 'command', name: '', client: {}, server: {} };
        flow.slices.push(newSlice);
    }
    return flow.slices[flow.slices.length - 1];
}

export function startClientBlock(slice: any, description: string): void {
    slice.client = { specs: [] };
    slice.clientDescription = description;
    currentSpecTarget = 'client';
}

export function endClientBlock(): void {
    currentSpecTarget = null;
}

export function startServerBlock(slice: any, description: string): void {
    slice.server = { specs: [] };
    slice.serverDescription = description;
    currentSpecTarget = 'server';
}

export function endServerBlock(): void {
    currentSpecTarget = null;
}

export function pushSpec(description: string): void {
    const slice = getCurrentSlice();
    const target = currentSpecTarget;
    if (!target) throw new Error('No active spec target');
    if (!slice[target]) slice[target] = { specs: [] };
    slice[target].specs.push({ description, should: [] });
    currentShouldList = slice[target].specs[slice[target].specs.length - 1].should;
}

export function startShouldBlock(description?: string): void {
    if (description && currentShouldList) {
        currentShouldList.push(description);
    }
}

export function endShouldBlock(): void {
    currentShouldList = null;
}


export function recordWhen(command: any) {
    const slice = getCurrentSlice();
    const specs = slice?.server?.specs;
    if (!specs || specs.length === 0) throw new Error('No active server spec to attach `when`');
    specs[specs.length - 1].when = command;
}

export function recordThen(...events: any[]) {
    const slice = getCurrentSlice();
    const specs = slice?.server?.specs;
    if (!specs || specs.length === 0) throw new Error('No active server spec to attach `then`');
    specs[specs.length - 1].then = events;
}