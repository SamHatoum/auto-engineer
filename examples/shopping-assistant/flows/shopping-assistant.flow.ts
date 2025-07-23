import {
  commandSlice,
  querySlice,
  reactSlice,
  flow,
  createBuilders,
  should,
  given,
  when,
  specs,
  gql,
  source,
  data,
  sink,
  type Command,
  type Event,
  type State,
  registerIntegrations,
} from '@auto-engineer/flowlang';

// @ts-ignore
const { ProductCatalog } = await import('../server/src/integrations/product-catalogue-integration');

// @ts-ignore
const { AI } = await import('../server/src/integrations/ai-integration');

import type { Products } from '../server/src/integrations/product-catalogue-integration';
import type { DoChat, ChatCompleted } from '../server/src/integrations/ai-integration';

registerIntegrations(ProductCatalog, AI);

type ShoppingCriteriaEntered = Event<
  'ShoppingCriteriaEntered',
  {
    sessionId: string;
    criteria: string;
    timestamp: Date;
  }
>;

type ItemsAddedToCart = Event<
  'ItemsAddedToCart',
  {
    sessionId: string;
    items: { productId: string; quantity: number }[];
    timestamp: Date;
  }
>;

type EnterShoppingCriteria = Command<
  'EnterShoppingCriteria',
  {
    sessionId: string;
    criteria: string;
  }
>;

type SuggestedItems = State<
  'SuggestedItems',
  {
    sessionId: string;
    items: { productId: string; name: string; quantity: number; reason: string }[];
  }
>;

type SuggestShoppingItems = Command<
  'SuggestShoppingItems',
  {
    sessionId: string;
    prompt: string;
  }
>;

type ShoppingItemsSuggested = Event<
  'ShoppingItemsSuggested',
  {
    sessionId: string;
    suggestedItems: { productId: string; name: string; quantity: number; reason: string }[];
  }
>;

type AddItemsToCart = Command<
  'AddItemsToCart',
  {
    sessionId: string;
    items: { productId: string; quantity: number }[];
  }
>;

// declareMessages(() => ({
//   Commands: [
//     {
//       name: 'DoChat',
//       schema: z.object({
//         sessionId: z.string(),
//         prompt: z.string(),
//       }),
//     },
//   ],
//   State: [
//     {
//       name: 'Products',
//       schema: z.object({
//         products: z.array(
//             z.object({
//               productId: z.string(),
//               name: z.string(),
//               price: z.number(),
//             }),
//         ),
//       }),
//     },
//   ],
// }));

const { Events, Commands, State } = createBuilders()
  .events<ShoppingCriteriaEntered | ShoppingItemsSuggested | ChatCompleted | ItemsAddedToCart>()
  .commands<EnterShoppingCriteria | SuggestShoppingItems | DoChat | AddItemsToCart>()
  .state<{
    Products: Products['data'];
    SuggestedItems: SuggestedItems['data'];
  }>();

flow('Seasonal Assistant', () => {
  commandSlice('enters shopping criteria into assistant')
    .client(() => {
      specs('Assistant Chat Interface', () => {
        should('allow shopper to describe their shopping needs in natural language');
        should('provide a text input for entering criteria');
        should('show examples of what to include (age, interests, budget)');
        should('show a button to submit the criteria');
        should('generate a persisted session id for a visit');
        should('show the header on top of every page');
      });
    })
    .request(gql`
      mutation EnterShoppingCriteria($input: EnterShoppingCriteriaInput!) {
        enterShoppingCriteria(input: $input) {
          success
          error {
            type
            message
          }
        }
      }
    `)
    .server(() => {
      data([sink().event('ShoppingCriteriaEntered').toStream('shopping-session-${sessionId}')]);
      specs('When shopper submits criteria, a shopping session is started', () => {
        when(
          Commands.EnterShoppingCriteria({
            sessionId: 'shopper-123',
            criteria:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          }),
        ).then([
          Events.ShoppingCriteriaEntered({
            sessionId: 'shopper-123',
            criteria:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
            timestamp: new Date(),
          }),
        ]);
      });
    });

  reactSlice('finds items in product catalogue').server(() => {
    specs('When shopping criteria are entered, request wishlist creation', () => {
      when([
        Events.ShoppingCriteriaEntered({
          sessionId: 'session-abc',
          criteria:
            'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          timestamp: new Date(),
        }),
      ]).then([
        Commands.SuggestShoppingItems({
          sessionId: 'session-abc',
          prompt:
            'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
        }),
      ]);
    });
  });

  commandSlice('Suggest Shopping Items').server(() => {
    data([
      sink()
        .command('SuggestShoppingItems')
        .toIntegration(AI, 'DoChat', 'command')
        .withState(source().state('Products').fromIntegration(ProductCatalog))
        .additionalInstructions(
          'add the following to the DoChat systemPrompt: use the PRODUCT_CATALOGUE_PRODUCTS MCP tool to get product data',
        ),
      sink().event('ShoppingItemsSuggested').toStream('shopping-session-${sessionId}'),
    ]);

    specs('When chat is triggered, AI suggests items based on product catalog', () => {
      given([
        State.Products({
          products: [
            {
              productId: 'prod-soccer-ball',
              name: 'Super Soccer Ball',
              category: 'Sports',
              price: 10,
              tags: ['soccer', 'sports'],
              imageUrl: 'https://example.com/soccer-ball.jpg',
            },
            {
              productId: 'prod-craft-kit',
              name: 'Deluxe Craft Kit',
              category: 'Arts & Crafts',
              price: 25,
              tags: ['crafts', 'art', 'creative'],
              imageUrl: 'https://example.com/craft-kit.jpg',
            },
            {
              productId: 'prod-laptop-bag',
              name: 'Tech Laptop Backpack',
              category: 'School Supplies',
              price: 45,
              tags: ['computers', 'tech', 'school'],
              imageUrl: 'https://example.com/laptop-bag.jpg',
            },
            {
              productId: 'prod-mtg-starter',
              name: 'Magic the Gathering Starter Set',
              category: 'Games',
              price: 30,
              tags: ['magic', 'tcg', 'games'],
              imageUrl: 'https://example.com/mtg-starter.jpg',
            },
          ],
        }),
      ])
        .when(
          Commands.SuggestShoppingItems({
            sessionId: 'session-abc',
            prompt:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          }),
        )
        .then([
          Events.ShoppingItemsSuggested({
            sessionId: 'session-abc',
            suggestedItems: [
              {
                productId: 'prod-soccer-ball',
                name: 'Super Soccer Ball',
                quantity: 1,
                reason: 'Perfect for your daughter who loves soccer',
              },
              {
                productId: 'prod-craft-kit',
                name: 'Deluxe Craft Kit',
                quantity: 1,
                reason: 'Great for creative activities and crafts',
              },
              {
                productId: 'prod-laptop-bag',
                name: 'Tech Laptop Backpack',
                quantity: 1,
                reason: `Essential for your son's school computer needs`,
              },
              {
                productId: 'prod-mtg-starter',
                name: 'Magic the Gathering Starter Set',
                quantity: 1,
                reason: 'Ideal starter set for Magic the Gathering enthusiasts',
              },
            ],
          }),
        ]);
    });
  });

  querySlice('views suggested items')
    .request(gql`
      query GetSuggestedItems($sessionId: ID!) {
        suggestedItems(sessionId: $sessionId) {
          items {
            productId
            name
            quantity
            reason
          }
        }
      }
    `)
    .client(() => {
      specs('Suggested Items Screen', () => {
        should('display all suggested items with names and reasons');
        should('show quantity selectors for each item');
        should('have an "Add to Cart" button for selected items');
        should('allow removing items from the suggestions');
      });
    })
    .server(() => {
      data([source().state('SuggestedItems').fromProjection('SuggestedItemsProjection', 'sessionId')]);

      specs('Suggested items are available for viewing', () => {
        given([
          Events.ShoppingItemsSuggested({
            sessionId: 'session-abc',
            suggestedItems: [
              {
                productId: 'prod-soccer-ball',
                name: 'Super Soccer Ball',
                quantity: 1,
                reason: 'Perfect for your daughter who loves soccer',
              },
              {
                productId: 'prod-craft-kit',
                name: 'Deluxe Craft Kit',
                quantity: 1,
                reason: 'Great for creative activities and crafts',
              },
              {
                productId: 'prod-laptop-bag',
                name: 'Tech Laptop Backpack',
                quantity: 1,
                reason: `Essential for your son's school computer needs`,
              },
              {
                productId: 'prod-mtg-starter',
                name: 'Magic the Gathering Starter Set',
                quantity: 1,
                reason: 'Ideal starter set for Magic the Gathering enthusiasts',
              },
            ],
          }),
        ]).then([
          State.SuggestedItems({
            sessionId: 'session-abc',
            items: [
              {
                productId: 'prod-soccer-ball',
                name: 'Super Soccer Ball',
                quantity: 1,
                reason: 'Perfect for your daughter who loves soccer',
              },
              {
                productId: 'prod-craft-kit',
                name: 'Deluxe Craft Kit',
                quantity: 1,
                reason: 'Great for creative activities and crafts',
              },
              {
                productId: 'prod-laptop-bag',
                name: 'Tech Laptop Backpack',
                quantity: 1,
                reason: `Essential for your son's school computer needs`,
              },
              {
                productId: 'prod-mtg-starter',
                name: 'Magic the Gathering Starter Set',
                quantity: 1,
                reason: 'Ideal starter set for Magic the Gathering enthusiasts',
              },
            ],
          }),
        ]);
      });
    });

  commandSlice('accepts items and adds to their cart')
    .client(() => {
      specs('Suggested Items Screen', () => {
        should('allow selecting specific items to add');
        should('update quantities before adding to cart');
        should('provide feedback when items are added');
      });
    })
    .server(() => {
      specs('When shopper accepts items, they are added to cart', () => {
        when(
          Commands.AddItemsToCart({
            sessionId: 'session-abc',
            items: [
              { productId: 'prod-soccer-ball', quantity: 1 },
              { productId: 'prod-craft-kit', quantity: 1 },
              { productId: 'prod-laptop-bag', quantity: 1 },
              { productId: 'prod-mtg-starter', quantity: 1 },
            ],
          }),
        ).then([
          Events.ItemsAddedToCart({
            sessionId: 'session-abc',
            items: [
              { productId: 'prod-soccer-ball', quantity: 1 },
              { productId: 'prod-craft-kit', quantity: 1 },
              { productId: 'prod-laptop-bag', quantity: 1 },
              { productId: 'prod-mtg-starter', quantity: 1 },
            ],
            timestamp: new Date(),
          }),
        ]);
      });
    });
});
