import { Command } from '@event-driven-io/emmett';
export type SuggestShoppingItems = Command<
  'SuggestShoppingItems',
  {
    sessionId: string;
    prompt: string;
  }
>;
