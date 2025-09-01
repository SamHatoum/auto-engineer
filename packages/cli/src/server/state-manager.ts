import type { Event } from '@auto-engineer/message-bus';
import createDebug from 'debug';

const debug = createDebug('auto-engineer:server:state');

export type FoldFunction<S = unknown, E = Event> = (state: S, event: E) => S;

export class StateManager<State = Record<string, unknown>> {
  private state: State;
  private folds: Map<string, FoldFunction<State>> = new Map();

  constructor(initialState?: State) {
    this.state = initialState ?? ({} as State);
    debug('StateManager initialized with state:', this.state);
  }

  /**
   * Register a fold function for a specific event type
   */
  registerFold(eventType: string, fold: FoldFunction<State>): void {
    debug('Registering fold for event type:', eventType);
    this.folds.set(eventType, fold);
  }

  /**
   * Apply an event to the state using registered fold functions
   */
  applyEvent(event: Event): void {
    const fold = this.folds.get(event.type);
    if (fold) {
      debug('Applying fold for event:', event.type);
      debug('Current state before fold:', JSON.stringify(this.state));
      const oldState = this.state;
      this.state = fold(this.state, event);
      debug('State updated from', JSON.stringify(oldState), 'to', JSON.stringify(this.state));
    } else {
      debug('No fold registered for event type:', event.type);
      debug('Available folds:', Array.from(this.folds.keys()));
    }
  }

  /**
   * Get the current state
   */
  getState(): State {
    return this.state;
  }

  /**
   * Get a specific property from the state
   */
  getStateProperty(path: string): unknown {
    const keys = path.split('.');
    let current: unknown = this.state;

    for (const key of keys) {
      if (current !== null && current !== undefined && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
