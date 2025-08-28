import { IllegalStateError } from '@event-driven-io/emmett';
import type { State } from './state';
import type { AddItemsToCart } from './commands';
import type { ItemsAddedToCart } from './events';

export const decide = (command: AddItemsToCart, state: State): ItemsAddedToCart => {
  switch (command.type) {
    case 'AddItemsToCart': {
      /**
       * ## IMPLEMENTATION INSTRUCTIONS ##
       *
       * This command can directly emit one or more events based on the input.
       *
       * You should:
       * - Validate the command input fields
       * - Inspect the current domain `state` to determine if the command is allowed
       * - If invalid, throw one of the following domain errors: `NotFoundError`, `ValidationError`, or `IllegalStateError`
       * - If valid, return one or more events with the correct structure
       *
       * ⚠️ Only read from inputs — never mutate them. `evolve.ts` handles state updates.
       */

      // return {
      //   type: 'ItemsAddedToCart',
      //   data: { ...command.data },
      // } as ItemsAddedToCart;

      throw new IllegalStateError('Not yet implemented: ' + command.type);
    }
    default:
      throw new IllegalStateError('Unexpected command type: ' + command.type);
  }
};
