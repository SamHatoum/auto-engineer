import { describe, it } from 'vitest';
import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialState } from './state';

describe('Seasonal Assistant | enters shopping criteria into assistant', () => {
  const given = DeciderSpecification.for({
    decide,
    evolve,
    initialState,
  });

  it('should emit ShoppingCriteriaEntered for valid EnterShoppingCriteria', () => {
    given([])
      .when({
        type: 'EnterShoppingCriteria',
        data: {
          sessionId: 'shopper-123',
          criteria:
            'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
        },
        metadata: { now: new Date() },
      })

      .then([
        {
          type: 'ShoppingCriteriaEntered',
          data: {
            sessionId: 'shopper-123',
            criteria:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          },
        },
      ]);
  });
});
