import { FlowSchema } from './schema';
import {Flow} from "./index";

class FlowRegistry {
  private flows: Flow[] = [];

  register(flow: Flow) {
    const validated = FlowSchema.parse(flow);
    this.flows.push(validated);
  }

  getAllFlows(): Flow[] {
    return [...this.flows];
  }

  clearAll() {
    this.flows = [];
  }
}

export const registry = new FlowRegistry();