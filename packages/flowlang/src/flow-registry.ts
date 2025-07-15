export interface FlowSchema {
  name: string;
  slices: Record<string, unknown>[];
}

class FlowRegistry {
  private flows: FlowSchema[] = [];

  register(flow: FlowSchema) {
    this.flows.push(flow);
  }

  getAllFlows(): FlowSchema[] {
    return [...this.flows];
  }

  clearAll() {
    this.flows = [];
  }
}

export const registry = new FlowRegistry();
