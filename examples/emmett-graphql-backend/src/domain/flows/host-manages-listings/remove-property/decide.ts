import { IllegalStateError } from '@event-driven-io/emmett';
import type { PropertyState } from './state';
import type { RemoveProperty } from './commands';
import type { PropertyRemoved } from './events';

export const decide = (command: RemoveProperty, state: PropertyState): PropertyRemoved => {
  if (state.status !== 'Listed') {
    throw new IllegalStateError('Cannot remove a property that is not listed');
  }
  return {
    type: 'PropertyRemoved',
    data: {
      ...command.data,
      removedAt: new Date(),
    },
  };
};
