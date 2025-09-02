import type { Event } from '@event-driven-io/emmett';

export type ShoppingItemsSuggested = Event<
  'ShoppingItemsSuggested',
  {
    sessionId: string;
    suggestedItems: Array<{ productId: string; name: string; quantity: number; reason: string }>;
  }
>;
