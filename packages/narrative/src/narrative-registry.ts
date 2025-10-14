import { NarrativeSchema } from './schema';
import { Narrative } from './index';
import createDebug from 'debug';

const debug = createDebug('auto:narrative:registry');
// Set non-error-like colors for debug namespace
// Colors: 0=gray, 1=red, 2=green, 3=yellow, 4=blue, 5=magenta, 6=cyan
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '6'; // cyan
}

class NarrativeRegistry {
  private narratives: Narrative[] = [];
  private instanceId = Math.random().toString(36).substring(7);

  constructor() {
    debug('Creating new NarrativeRegistry instance: %s', this.instanceId);
  }

  register(narrative: Narrative) {
    debug('Registering narrative: %s on instance %s', narrative.name, this.instanceId);
    debug('Narrative slices: %d', narrative.slices.length);
    debug('Narratives array before push: %d', this.narratives.length);
    debug('Array object ID before: %s', this.narratives);
    const validated = NarrativeSchema.parse(narrative);
    this.narratives.push(validated);
    debug('Narratives array after push: %d', this.narratives.length);
    debug('Array object ID after: %s', this.narratives);
    debug(
      'Successfully registered narrative: %s on instance %s, total narratives: %d',
      narrative.name,
      this.instanceId,
      this.narratives.length,
    );
  }

  getAllNarratives(): Narrative[] {
    debug('Getting all narratives, count: %d', this.narratives.length);
    debug('Registry instance ID: %s', this.instanceId);
    debug('Array object ID: %s', this.narratives);
    debug('this === registry? %s', this === registry);
    if (this.narratives.length > 0) {
      debug(
        'Narratives: %o',
        this.narratives.map((f) => f.name),
      );
    }
    return [...this.narratives];
  }

  clearAll() {
    debug('Clearing all narratives on instance %s, current count: %d', this.instanceId, this.narratives.length);
    if (this.narratives.length > 0) {
      debug(
        'Clearing narratives on instance %s: %o',
        this.instanceId,
        this.narratives.map((f) => f.name),
      );
    }
    this.narratives = [];
    debug('Cleared! Instance %s now has %d narratives', this.instanceId, this.narratives.length);
  }
}

export const registry = new NarrativeRegistry();
