import { FlowSchema } from './schema';
import { Flow } from './index';
import createDebug from 'debug';

const debug = createDebug('auto:flow:registry');
// Set non-error-like colors for debug namespace
// Colors: 0=gray, 1=red, 2=green, 3=yellow, 4=blue, 5=magenta, 6=cyan
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '6'; // cyan
}

class FlowRegistry {
  private flows: Flow[] = [];
  private instanceId = Math.random().toString(36).substring(7);

  constructor() {
    debug('Creating new FlowRegistry instance: %s', this.instanceId);
  }

  register(flow: Flow) {
    debug('Registering flow: %s on instance %s', flow.name, this.instanceId);
    debug('Flow slices: %d', flow.slices.length);
    debug('Flows array before push: %d', this.flows.length);
    debug('Array object ID before: %s', this.flows);
    const validated = FlowSchema.parse(flow);
    this.flows.push(validated);
    debug('Flows array after push: %d', this.flows.length);
    debug('Array object ID after: %s', this.flows);
    debug(
      'Successfully registered flow: %s on instance %s, total flows: %d',
      flow.name,
      this.instanceId,
      this.flows.length,
    );
  }

  getAllFlows(): Flow[] {
    debug('Getting all flows, count: %d', this.flows.length);
    debug('Registry instance ID: %s', this.instanceId);
    debug('Array object ID: %s', this.flows);
    debug('this === registry? %s', this === registry);
    if (this.flows.length > 0) {
      debug(
        'Flows: %o',
        this.flows.map((f) => f.name),
      );
    }
    return [...this.flows];
  }

  clearAll() {
    debug('Clearing all flows on instance %s, current count: %d', this.instanceId, this.flows.length);
    if (this.flows.length > 0) {
      debug(
        'Clearing flows on instance %s: %o',
        this.instanceId,
        this.flows.map((f) => f.name),
      );
    }
    this.flows = [];
    debug('Cleared! Instance %s now has %d flows', this.instanceId, this.flows.length);
  }
}

export const registry = new FlowRegistry();
