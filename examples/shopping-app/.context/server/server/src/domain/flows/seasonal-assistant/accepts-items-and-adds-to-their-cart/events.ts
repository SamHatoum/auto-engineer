import type { Event } from '@event-driven-io/emmett';

export type ItemsAddedToCart = Event<
  'ItemsAddedToCart',
  {
    sessionId: string;
    items: Array<{ productId: string; quantity: number }>;
  }
>;
