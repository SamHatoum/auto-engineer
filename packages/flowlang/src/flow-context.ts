import type { FlowSchema } from './flow-registry';

let currentFlow: FlowSchema | null = null;
let currentSpecTarget: 'client' | 'server' | null = null;
let currentShouldList: string[] | null = null;

export function startFlow(name: string): FlowSchema {
    currentFlow = { name, slices: [] };
    return currentFlow;
}

export function getCurrentFlow(): FlowSchema | null {
    return currentFlow;
}

export function clearCurrentFlow(): void {
    currentFlow = null;
}

export function getCurrentSlice(): Record<string, unknown> | null {
    const flow = getCurrentFlow();
    if (!flow) return null;
    if (flow.slices.length === 0) {
        const newSlice = { type: 'command', name: '', client: {}, server: {} };
        flow.slices.push(newSlice);
    }
    return flow.slices[flow.slices.length - 1];
}

export function startClientBlock(slice: Record<string, unknown>, description: string): void {
    slice.client = { specs: [] };
    slice.clientDescription = description;
    currentSpecTarget = 'client';
}

export function endClientBlock(): void {
    currentSpecTarget = null;
}

export function startServerBlock(slice: Record<string, unknown>, description: string): void {
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
    if (!slice) throw new Error('No active slice');
    
    const sliceTarget = slice[target] as Record<string, unknown>;
    if (typeof sliceTarget !== 'object' || sliceTarget === null) {
        slice[target] = { specs: [] };
    }
    
    const targetWithSpecs = slice[target] as { specs: Array<{ description: string; should: string[] }> };
    targetWithSpecs.specs.push({ description, should: [] });
    currentShouldList = targetWithSpecs.specs[targetWithSpecs.specs.length - 1].should;
}

export function startShouldBlock(description?: string): void {
    if (typeof description === 'string' && currentShouldList !== null) {
        currentShouldList.push(description);
    }
}

export function endShouldBlock(): void {
    currentShouldList = null;
}


export function recordWhen(command: Record<string, unknown>) {
    const slice = getCurrentSlice();
    const server = slice?.server as Record<string, unknown>;
    const specs = server?.specs as Array<Record<string, unknown>>;
    if (!Array.isArray(specs) || specs.length === 0) throw new Error('No active server spec to attach `when`');
    specs[specs.length - 1].when = command;
}

export function recordThen(...events: Record<string, unknown>[]) {
    const slice = getCurrentSlice();
    const server = slice?.server as Record<string, unknown>;
    const specs = server?.specs as Array<Record<string, unknown>>;
    if (!Array.isArray(specs) || specs.length === 0) throw new Error('No active server spec to attach `then`');
    specs[specs.length - 1].then = events;
}