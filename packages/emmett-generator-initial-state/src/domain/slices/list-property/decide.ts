import { IllegalStateError } from '@event-driven-io/emmett';
import type { PropertyState } from './state';
import type { ListProperty } from './commands';
import {PropertyListed} from "./events";

export const decide = (
    command: ListProperty,
    state: PropertyState
): PropertyListed => {
  if (command.type !== 'ListProperty') {
    throw new IllegalStateError(`Unexpected command type: ${command.type}`);
  }
  return listProperty(command, state);
};

export const listProperty = (
    command: ListProperty,
    state: PropertyState
): PropertyListed => {
  if (state.status !== 'Empty') {
    throw new IllegalStateError('Property already exists');
  }

  return {
    type: 'PropertyListed',
    data: {
      ...command.data,
      listedAt: new Date(),
    },
  };
};