import { inMemoryReactor, type MessageHandlerResult, IllegalStateError } from '@event-driven-io/emmett';
import type { ShoppingCriteriaEntered } from '../enters-shopping-criteria-into-assistant/events';
import type { ReactorContext } from '../../../shared';

export const react = ({ eventStore, commandSender }: ReactorContext) =>
  inMemoryReactor<ShoppingCriteriaEntered>({
    processorId: 'seasonal-assistant-creates-a-chat-session-',
    canHandle: ['ShoppingCriteriaEntered'],
    connectionOptions: {
      database: eventStore.database,
    },
    eachMessage: async (event, context): Promise<MessageHandlerResult> => {
      /**
       * ## IMPLEMENTATION INSTRUCTIONS ##
       *
       * - Inspect event data to determine if the command should be sent.
       * - Replace the placeholder logic and \`throw\` below with real implementation.
       * - Send one or more commands via: context.commandSender.send({...})
       * - Optionally return a MessageHandlerResult for SKIP or error cases.
       */

      throw new IllegalStateError('Not yet implemented: react in response to ShoppingCriteriaEntered');

      // Example:
      // if (event.data.status !== 'expected') {
      //   return {
      //     type: 'SKIP',
      //     reason: 'Condition not met',
      //   };
      // }

      // await context.commandSender.send({
      //   type: 'SuggestShoppingItems',
      //   kind: 'Command',
      //   data: {
      //     // Map event fields to command fields here
      //     // e.g., userId: event.data.userId,
      //   },
      // });

      // return;
    },
  });
