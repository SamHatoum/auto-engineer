import { describe, it } from 'vitest';
import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialState } from './state';

describe('Seasonal Assistant | selects items relevant to the shopping criteria ', () => {
  const given = DeciderSpecification.for({
    decide,
    evolve,
    initialState,
  });

  it('should emit ShoppingItemsSuggested for valid SuggestShoppingItems', () => {
    given([
      {
        type: 'undefined',
        data: {
          products: [
            {
              productId: 'prod-soccer-ball',
              name: 'Super Soccer Ball',
              category: 'Sports',
              price: 10,
              tags: ['soccer', 'sports'],
              imageUrl: 'https://example.com/soccer-ball.jpg',
            },
            {
              productId: 'prod-craft-kit',
              name: 'Deluxe Craft Kit',
              category: 'Arts & Crafts',
              price: 25,
              tags: ['crafts', 'art', 'creative'],
              imageUrl: 'https://example.com/craft-kit.jpg',
            },
            {
              productId: 'prod-laptop-bag',
              name: 'Tech Laptop Backpack',
              category: 'School Supplies',
              price: 45,
              tags: ['computers', 'tech', 'school'],
              imageUrl: 'https://example.com/laptop-bag.jpg',
            },
            {
              productId: 'prod-mtg-starter',
              name: 'Magic the Gathering Starter Set',
              category: 'Games',
              price: 30,
              tags: ['magic', 'tcg', 'games'],
              imageUrl: 'https://example.com/mtg-starter.jpg',
            },
          ],
        },
      },
    ])
      .when({
        type: 'SuggestShoppingItems',
        data: {
          sessionId: 'session-abc',
          prompt:
            'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
        },
        metadata: { now: new Date() },
      })

      .then([
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
        },
      ]);
  });
});
