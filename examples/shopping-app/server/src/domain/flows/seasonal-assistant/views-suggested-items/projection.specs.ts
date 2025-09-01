import { describe, it, beforeEach, expect } from 'vitest';
import { InMemoryProjectionSpec } from '@event-driven-io/emmett';
import { projection } from './projection';
import type { ShoppingItemsSuggested } from '../selects-items-relevant-to-the-shopping-criteria-/events';
import { SuggestedItems } from './state';

type ProjectionEvent = ShoppingItemsSuggested;

describe('SuggestedItemsProjection Projection', () => {
  let given: InMemoryProjectionSpec<ProjectionEvent>;

  beforeEach(() => {
    given = InMemoryProjectionSpec.for({ projection });
  });

  it('creates or updates SuggestedItems document - case 1', () =>
    given([
      {
        type: 'ShoppingItemsSuggested',
        data: {
          sessionId: 'session-abc',
          suggestedItems: [
            {
              productId: 'prod-soccer-ball',
              name: 'Super Soccer Ball',
              quantity: 1,
              reason: 'Perfect for your daughter who loves soccer',
            },
            {
              productId: 'prod-craft-kit',
              name: 'Deluxe Craft Kit',
              quantity: 1,
              reason: 'Great for creative activities and crafts',
            },
            {
              productId: 'prod-laptop-bag',
              name: 'Tech Laptop Backpack',
              quantity: 1,
              reason: "Essential for your son's school computer needs",
            },
            {
              productId: 'prod-mtg-starter',
              name: 'Magic the Gathering Starter Set',
              quantity: 1,
              reason: 'Ideal starter set for Magic the Gathering enthusiasts',
            },
          ],
        },
        metadata: {
          streamName: 'ignored-stream',
          streamPosition: 1n,
          globalPosition: 1n,
        },
      },
    ])
      .when([])
      .then(async (state) => {
        const document = await state.database
          .collection<SuggestedItems>('SuggestedItemsProjection')
          .findOne((doc) => doc.sessionId === 'session-abc');

        const expected: SuggestedItems = {
          sessionId: 'session-abc',
          items: [
            {
              productId: 'prod-soccer-ball',
              name: 'Super Soccer Ball',
              quantity: 1,
              reason: 'Perfect for your daughter who loves soccer',
            },
            {
              productId: 'prod-craft-kit',
              name: 'Deluxe Craft Kit',
              quantity: 1,
              reason: 'Great for creative activities and crafts',
            },
            {
              productId: 'prod-laptop-bag',
              name: 'Tech Laptop Backpack',
              quantity: 1,
              reason: "Essential for your son's school computer needs",
            },
            {
              productId: 'prod-mtg-starter',
              name: 'Magic the Gathering Starter Set',
              quantity: 1,
              reason: 'Ideal starter set for Magic the Gathering enthusiasts',
            },
          ],
        };

        expect(document).toMatchObject(expected);
      }));
});
