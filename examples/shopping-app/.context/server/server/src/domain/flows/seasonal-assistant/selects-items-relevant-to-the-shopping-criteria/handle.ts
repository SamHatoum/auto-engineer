import '@auto-engineer/productcatalog-integration';

import { AI } from '@auto-engineer/ai-integration';

import { Products } from '@auto-engineer/productcatalog-integration';

import { CommandHandler, type EventStore, type MessageHandlerResult } from '@event-driven-io/emmett';
import { evolve } from './evolve';
import { initialState } from './state';
import { decide } from './decide';
import type { SuggestShoppingItems } from './commands';

/**
 * ## IMPLEMENTATION INSTRUCTIONS ##
 * add the following to the DoChat: schemaName: Products, systemPrompt: use the PRODUCT_CATALOGUE_PRODUCTS MCP tool to get product data
 */

const handler = CommandHandler({
  evolve,
  initialState,
});

export const handle = async (eventStore: EventStore, command: SuggestShoppingItems): Promise<MessageHandlerResult> => {
  const streamId = `shopping-session-${command.data.sessionId}`;

  try {
    // TODO: Map fields from the incoming command to this integration input.
    // - Use relevant fields from `command.data` to populate the required inputs below.
    // - Some fields may require transformation or enrichment.
    // - If additional context is needed, construct it here.
    // const products: Products | undefined = await AI.Commands?.DoChat<Products>({
    //   type: 'DoChat',
    //   data: {
    //    // sessionId: ???
    // prompt: ???
    // systemPrompt: ???
    // schemaName: ???
    //   },
    // });

    await handler(eventStore, streamId, (state) =>
      // TODO: add products as a parameter to decide once implemented above
      decide(command, state /* products */),
    );
    return; // success (returns void)
  } catch (error: any) {
    return {
      type: 'SKIP',
      reason: `Command failed: ${error?.message ?? 'Unknown'}`,
    };
  }
};
