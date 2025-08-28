import { Command } from '@event-driven-io/emmett';
export type AddItemsToCart = Command<
  'AddItemsToCart',
  {
    sessionId: string;
    items: Array<{ productId: string; quantity: number }>;
  }
>;
