import { Command } from '@event-driven-io/emmett';
export type EnterShoppingCriteria = Command<
  'EnterShoppingCriteria',
  {
    sessionId: string;
    criteria: string;
  }
>;
