import type { Event } from '@event-driven-io/emmett';

export type ShoppingCriteriaEntered = Event<
  'ShoppingCriteriaEntered',
  {
    sessionId: string;
    criteria: string;
  }
>;
