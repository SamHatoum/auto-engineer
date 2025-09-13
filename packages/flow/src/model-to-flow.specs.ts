import { describe, it, expect } from 'vitest';
import schema from './samples/seasonal-assistant.schema.json';
import { modelToFlow } from './transformers/model-to-flow';
import { Model } from './index';

describe('schemaToFlow', () => {
  it('should create a full flow DSL from a model', async () => {
    const code = await modelToFlow(schema as Model, {
      flowImport: '@auto-engineer/flow',
      integrationImport: '../server/src/integrations',
    });

    expect(code).toEqual(`import {
  command,
  data,
  example,
  flow,
  gql,
  query,
  react,
  rule,
  should,
  sink,
  source,
  specs,
  type Command,
  type Event,
  type State,
} from '@auto-engineer/flow';
import { AI, ProductCatalog, type Products } from '../server/src/integrations';

type AddItemsToCart = Command<
  'AddItemsToCart',
  {
    sessionId: string;
    items: {
      productId: string;
      quantity: number;
    }[];
  }
>;

type EnterShoppingCriteria = Command<
  'EnterShoppingCriteria',
  {
    sessionId: string;
    criteria: string;
  }
>;

type ItemsAddedToCart = Event<
  'ItemsAddedToCart',
  {
    sessionId: string;
    items: {
      productId: string;
      quantity: number;
    }[];
  }
>;

type ShoppingCriteriaEntered = Event<
  'ShoppingCriteriaEntered',
  {
    sessionId: string;
    criteria: string;
  }
>;

type ShoppingItemsSuggested = Event<
  'ShoppingItemsSuggested',
  {
    sessionId: string;
    suggestedItems: {
      productId: string;
      name: string;
      quantity: number;
      reason: string;
    }[];
  }
>;

type SuggestedItems = State<
  'SuggestedItems',
  {
    sessionId: string;
    items: {
      productId: string;
      name: string;
      quantity: number;
      reason: string;
    }[];
  }
>;

type SuggestShoppingItems = Command<
  'SuggestShoppingItems',
  {
    sessionId: string;
    prompt: string;
  }
>;

flow('Seasonal Assistant', () => {
  command('enters shopping criteria into assistant')
    .client(() => {
      specs('Assistant Chat Interface', () => {
        should('allow shopper to describe their shopping needs in natural language');
        should('provide a text input for entering criteria');
        should('show examples of what to include (age, interests, budget)');
        should('show a button to submit the criteria');
        should('generate a persisted session id for a visit');
        should('show the header on top of the page');
      });
    })
    .request(
      gql(\`mutation EnterShoppingCriteria($input: EnterShoppingCriteriaInput!) {
  enterShoppingCriteria(input: $input) {
    success
    error {
      type
      message
    }
  }
}\`),
    )
    .server(() => {
      data([sink().event('ShoppingCriteriaEntered').toStream('shopping-session-\${sessionId}')]);
      specs('When shopper submits criteria, a shopping session is started', () => {
        rule('Valid criteria should start a shopping session', () => {
          example('User submits shopping criteria for children')
            .when<EnterShoppingCriteria>({
              sessionId: 'shopper-123',
              criteria:
                'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
            })
            .then<ShoppingCriteriaEntered>({
              sessionId: 'shopper-123',
              criteria:
                'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
            });
        });
      });
    });
  react('creates a chat session').server(() => {
    specs('When shopping criteria are entered, request wishlist creation', () => {
      rule('Shopping criteria should trigger item suggestion', () => {
        example('Criteria entered triggers wishlist creation')
          .when<ShoppingCriteriaEntered>({
            sessionId: 'session-abc',
            criteria:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          })
          .then<SuggestShoppingItems>({
            sessionId: 'session-abc',
            prompt:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          });
      });
    });
  });
  command('selects items relevant to the shopping criteria').server(() => {
    data([
      sink()
        .command('SuggestShoppingItems')
        .toIntegration(AI, 'DoChat', 'command')
        .withState(source().state('Products').fromIntegration(ProductCatalog))
        .additionalInstructions(
          'add the following to the DoChat: schemaName: Products, systemPrompt: use the PRODUCT_CATALOGUE_PRODUCTS MCP tool to get product data',
        ),
      sink().event('ShoppingItemsSuggested').toStream('shopping-session-\${sessionId}'),
    ]);
    specs('When chat is triggered, AI suggests items based on product catalog', () => {
      rule('AI should suggest relevant items from available products', () => {
        example('Product catalog with matching items generates suggestions')
          .given<Products>({
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
          })
          .when<SuggestShoppingItems>({
            sessionId: 'session-abc',
            prompt:
              'I need back-to-school items for my 7-year-old daughter who loves soccer and crafts, and my 12-year-old son who is into computers and Magic the Gathering.',
          })
          .then<ShoppingItemsSuggested>({
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
                reason: "Essential for your son's school computer needs",
              },
              {
                productId: 'prod-mtg-starter',
                name: 'Magic the Gathering Starter Set',
                quantity: 1,
                reason: 'Ideal starter set for Magic the Gathering enthusiasts',
              },
            ],
          });
      });
    });
  });
  query('views suggested items')
    .client(() => {
      specs('Suggested Items Screen', () => {
        should('display all suggested items with names and reasons');
        should('show quantity selectors for each item');
        should('have an "Add to Cart" button for selected items');
        should('allow removing items from the suggestions');
      });
    })
    .request(
      gql(\`query GetSuggestedItems($sessionId: ID!) {
  suggestedItems(sessionId: $sessionId) {
    items {
      productId
      name
      quantity
      reason
    }
  }
}\`),
    )
    .server(() => {
      data([source().state('SuggestedItems').fromProjection('SuggestedItemsProjection', 'sessionId')]);
      specs('Suggested items are available for viewing', () => {
        rule('Items should be available for viewing after suggestion', () => {
          example('Item becomes available after AI suggestion event')
            .when<ShoppingItemsSuggested>({
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
                  reason: "Essential for your son's school computer needs",
                },
                {
                  productId: 'prod-mtg-starter',
                  name: 'Magic the Gathering Starter Set',
                  quantity: 1,
                  reason: 'Ideal starter set for Magic the Gathering enthusiasts',
                },
              ],
            })
            .then<SuggestedItems>({
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
                  reason: "Essential for your son's school computer needs",
                },
                {
                  productId: 'prod-mtg-starter',
                  name: 'Magic the Gathering Starter Set',
                  quantity: 1,
                  reason: 'Ideal starter set for Magic the Gathering enthusiasts',
                },
              ],
            });
        });
      });
    });
  command('accepts items and adds to their cart')
    .client(() => {
      specs('Suggested Items Screen', () => {
        should('allow selecting specific items to add');
        should('update quantities before adding to cart');
        should('provide feedback when items are added');
      });
    })
    .server(() => {
      data([sink().event('ItemsAddedToCart').toStream('shopping-session-\${sessionId}')]);
      specs('When shopper accepts items, they are added to cart', () => {
        rule('Accepted items should be added to the shopping cart', () => {
          example('User selects all suggested items for cart')
            .when<AddItemsToCart>({
              sessionId: 'session-abc',
              items: [
                { productId: 'prod-soccer-ball', quantity: 1 },
                { productId: 'prod-craft-kit', quantity: 1 },
                { productId: 'prod-laptop-bag', quantity: 1 },
                { productId: 'prod-mtg-starter', quantity: 1 },
              ],
            })
            .then<ItemsAddedToCart>({
              sessionId: 'session-abc',
              items: [
                { productId: 'prod-soccer-ball', quantity: 1 },
                { productId: 'prod-craft-kit', quantity: 1 },
                { productId: 'prod-laptop-bag', quantity: 1 },
                { productId: 'prod-mtg-starter', quantity: 1 },
              ],
            });
        });
      });
    });
});
`);
  });
});
