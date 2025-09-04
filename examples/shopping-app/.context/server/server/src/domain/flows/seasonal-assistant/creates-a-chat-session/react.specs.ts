import { describe, it, beforeEach } from 'vitest';
import 'reflect-metadata';
import { getInMemoryEventStore, type InMemoryEventStore, type CommandSender } from '@event-driven-io/emmett';
import { type ReactorContext, ReactorSpecification } from '../../../shared';
import { react } from './react';
import type { ShoppingCriteriaEntered } from '../enters-shopping-criteria-into-assistant/events';
import type { SuggestShoppingItems } from '../selects-items-relevant-to-the-shopping-criteria/commands';

describe('SeasonalAssistant | CreatesAChatSession', () => {
  let eventStore: InMemoryEventStore;
  let given: ReactorSpecification<ShoppingCriteriaEntered, SuggestShoppingItems, ReactorContext>;
  let messageBus: CommandSender;

  beforeEach(() => {
    eventStore = getInMemoryEventStore({});
    given = ReactorSpecification.for<ShoppingCriteriaEntered, SuggestShoppingItems, ReactorContext>(
      () => react({ eventStore, commandSender: messageBus }),
      (commandSender) => {
        messageBus = commandSender;
        return {
          eventStore,
          commandSender,
          database: eventStore.database,
        };
      },
    );
  });

  it('should send SuggestShoppingItems when ShoppingCriteriaEntered is received', async () => {
    await given([])
      .when({
        type: 'ShoppingCriteriaEntered',
        data: {
          sessionId: 'session-abc',
          criteria:
            'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          timestamp: new Date('2025-09-04T21:20:20.309Z'),
        },
      })

      .then({
        type: 'SuggestShoppingItems',
        kind: 'Command',
        data: {
          sessionId: 'session-abc',
          prompt:
            'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
        },
      });
  });
});
