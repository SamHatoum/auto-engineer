import { describe, it } from 'vitest';
import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialState } from './state';

describe('Seasonal Assistant | accepts items and adds to their cart', () => {
  const given = DeciderSpecification.for({
    decide,
    evolve,
    initialState,
  });

  it('should emit ItemsAddedToCart for valid AddItemsToCart', () => {
    given([])
      .when({
        type: 'AddItemsToCart',
        data: {
          sessionId: 'session-abc',
          items: [
            { productId: 'prod-soccer-ball', quantity: 1 },
            { productId: 'prod-craft-kit', quantity: 1 },
            { productId: 'prod-laptop-bag', quantity: 1 },
            { productId: 'prod-mtg-starter', quantity: 1 },
          ],
        },
        metadata: { now: new Date() },
      })

      .then([
        {
          type: 'ItemsAddedToCart',
          data: {
            sessionId: 'session-abc',
            items: [
              { productId: 'prod-soccer-ball', quantity: 1 },
              { productId: 'prod-craft-kit', quantity: 1 },
              { productId: 'prod-laptop-bag', quantity: 1 },
              { productId: 'prod-mtg-starter', quantity: 1 },
            ],
            timestamp: new Date('2025-09-04T06:26:22.879Z'),
          },
        },
      ]);
  });
});
