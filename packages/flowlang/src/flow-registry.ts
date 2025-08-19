import { FlowSchema } from './schema';
import { Flow } from './index';
import createDebug from 'debug';

const debug = createDebug('flowlang:registry');

class FlowRegistry {
  private flows: Flow[] = [];

  register(flow: Flow) {
    debug('Registering flow: %s', flow.name);
    debug('Flow slices: %d', flow.slices.length);
    const validated = FlowSchema.parse(flow);
    this.flows.push(validated);
    debug('Successfully registered flow: %s, total flows: %d', flow.name, this.flows.length);
  }

  getAllFlows(): Flow[] {
    debug('Getting all flows, count: %d', this.flows.length);
    if (this.flows.length > 0) {
      debug(
        'Flows: %o',
        this.flows.map((f) => f.name),
      );
    }
    return [...this.flows];
  }

  clearAll() {
    debug('Clearing all flows, current count: %d', this.flows.length);
    if (this.flows.length > 0) {
      debug(
        'Clearing flows: %o',
        this.flows.map((f) => f.name),
      );
    }
    this.flows = [];
  }
}

export const registry = new FlowRegistry();
