import type { State } from './state';
import type { ShoppingItemsSuggested } from './events';

/**
 * ## IMPLEMENTATION INSTRUCTIONS ##
 *
 * This function defines how the domain state evolves in response to events.
 *
 * Guidelines:
 * - Apply only the **minimal** necessary changes for future decisions in `decide.ts`.
 * - Ignore any event fields not required for decision-making logic.
 * - If the event doesn’t change decision-relevant state, return the existing `state`.
 * - Prefer immutability: always return a **new state object**.
 * - Avoid spreading all of `event.data` unless all fields are relevant.
 */

export const evolve = (state: State, event: ShoppingItemsSuggested): State => {
  switch (event.type) {
    case 'ShoppingItemsSuggested': {
      // TODO: Update state based on ShoppingItemsSuggested
      return {
        ...state,
      };
    }
    default:
      return state;
  }
};
