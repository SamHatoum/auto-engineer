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
} from '@auto-engineer/flowlang';
import type { Event, Command } from '@event-driven-io/emmett';
import type { State } from '@auto-engineer/flowlang';
import { ProductCatalogService, type Products as ImportedProducts } from '@examples/product-catalogue-integration';

// Re-export in this module to help TypeScript resolve the union
type Products = ImportedProducts;

type ShoppingCriteriaEntered = Event<
  'ShoppingCriteriaEntered',
  {
    sessionId: string;
    shopperId: string;
    criteria: string;
    timestamp: Date;
  }
>;

type WishlistRequested = Event<
  'WishlistRequested',
  {
    sessionId: string;
    criteria: string;
    timestamp: Date;
  }
>;

type ChatCompleted = Event<
  'ChatCompleted',
  {
    sessionId: string;
    suggestedItems: { productId: string; name: string; quantity: number; reason: string }[];
    timestamp: Date;
  }
>;

type ItemsAddedToCart = Event<
  'ItemsAddedToCart',
  {
    cartId: string;
    shopperId: string;
    items: { productId: string; quantity: number }[];
    timestamp: Date;
  }
>;

type EnterShoppingCriteria = Command<
  'EnterShoppingCriteria',
  {
    shopperId: string;
    criteria: string;
  }
>;

type RequestWishlist = Command<
  'RequestWishlist',
  {
    sessionId: string;
    criteria: string;
  }
>;

type DoChat = Command<
  'DoChat',
  {
    sessionId: string;
    prompt: string;
  }
>;

type AddItemsToCart = Command<
  'AddItemsToCart',
  {
    sessionId: string;
    items: { productId: string; quantity: number }[];
  }
>;

type SuggestedItems = State<
  'SuggestedItems',
  {
    sessionId: string;
    items: { productId: string; name: string; quantity: number; reason: string }[];
  }
>;

type ShoppingSession = State<
  'ShoppingSession',
  {
    sessionId: string;
    shopperId: string;
    criteria: string;
    status: 'active' | 'completed';
  }
>;

// Note: State uses object mapping instead of union types like Events/Commands
// due to TypeScript limitations with cross-module union type resolution
const { Events, Commands, State } = createBuilders()
  .events<ShoppingCriteriaEntered | WishlistRequested | ChatCompleted | ItemsAddedToCart>()
  .commands<EnterShoppingCriteria | RequestWishlist | DoChat | AddItemsToCart>()
  .state<{ Products: Products['data']; SuggestedItems: SuggestedItems['data']; ShoppingSession: ShoppingSession['data'] }>();

flow('Seasonal Assistant', () => {
  commandSlice('enters shopping criteria into assistant')
    .client(() => {
      specs('Assistant Chat Interface', () => {
        should('allow shopper to describe their shopping needs in natural language');
        should('provide a text input for entering criteria');
        should('show examples of what to include (age, interests, budget)');
      });
    })
    .server(() => {
      data([sink().event('ShoppingCriteriaEntered').toStream('shopping-session-{id}')]);
      specs('When shopper submits criteria, a shopping session is started', () => {
        when(
          Commands.EnterShoppingCriteria({
            shopperId: 'shopper-123',
            criteria:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          }),
        ).then([
          Events.ShoppingCriteriaEntered({
            sessionId: 'session-abc',
            shopperId: 'shopper-123',
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
          shopperId: 'shopper-123',
          criteria:
            'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          timestamp: new Date(),
        }),
      ]).then([
        Commands.DoChat({
          sessionId: 'session-abc',
          prompt:
            'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
        }),
      ]);
    });
  });

  commandSlice('Do Chat').server(() => {
    data([
      // sink().command('DoChat').toIntegration(AI).withStream('URN'),
      source().state('Product').fromIntegration(ProductCatalogService),
    ]);

    specs('When chat is triggered, AI suggests items based on product catalog', () => {
      given([
        State.Products(
          {
            products: [
              {
                productId: 'prod-soccer-ball',
                name: 'Super Soccer Ball',
                category: 'Sports',
                price: 10,
                tags: ['soccer', 'sports'],
              }, {
                productId: 'prod-craft-kit',
                name: 'Deluxe Craft Kit',
                category: 'Arts & Crafts',
                price: 25,
                tags: ['crafts', 'art', 'creative'],
              }, {
                productId: 'prod-laptop-bag',
                name: 'Tech Laptop Backpack',
                category: 'School Supplies',
                price: 45,
                tags: ['computers', 'tech', 'school'],
              }, {
                productId: 'prod-mtg-starter',
                name: 'Magic the Gathering Starter Set',
                category: 'Games',
                price: 30,
                tags: ['magic', 'tcg', 'games'],
              }]
          }),
      ])
        .when(
          Commands.DoChat({
            sessionId: 'session-abc',
            prompt:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
            // sysmte prompt will say : find the the right tools in the MCP server, based on the GQL schmea descrotions, to get the data you need
            // as per the specs hints
          }),
        )
        .then([
          Events.ChatCompleted({
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
            timestamp: new Date(),
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
      data([source().state('SuggestedItems').fromProjection('SuggestedItemsProjection')]);

      specs('Suggested items are available for viewing', () => {
        when(
          Events.ChatCompleted({
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
            timestamp: new Date(),
          }),
        ).then([
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
            cartId: 'cart-xyz',
            shopperId: 'shopper-123',
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
