import { IllegalStateError } from '@event-driven-io/emmett';
import type { State } from './state';
import type { SuggestShoppingItems } from './commands';
import type { ShoppingItemsSuggested } from './events';
import type { Products } from '@auto-engineer/product-catalog-integration';

export const decide = (command: SuggestShoppingItems, state: State, products?: Products): ShoppingItemsSuggested => {
  switch (command.type) {
    case 'SuggestShoppingItems': {
      /**
       * ## IMPLEMENTATION INSTRUCTIONS ##
       *
       * This command requires evaluating prior state to determine if it can proceed.
       *
       * You should:
       * - Validate the command input fields
       * - Inspect the current domain `state` to determine if the command is allowed
       * - Use `products` (integration result) to enrich or filter the output
       * - If invalid, throw one of the following domain errors: `NotFoundError`, `ValidationError`, or `IllegalStateError`
       * - If valid, return one or more events with the correct structure
       *
       * ⚠️ Only read from inputs — never mutate them. `evolve.ts` handles state updates.
       *
       * Integration result shape (Products):
       * products?.data = {
       *   products: Array<{
       *     productId: string; name;
       *   }>;
       * }
       */

      // return {
      //   type: 'ShoppingItemsSuggested',
      //   data: { ...command.data },
      // } as ShoppingItemsSuggested;

      throw new IllegalStateError('Not yet implemented: ' + command.type);
    }
    default:
      throw new IllegalStateError('Unexpected command type: ' + command.type);
  }
};
