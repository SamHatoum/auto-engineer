import { describe, it, expect } from 'vitest';
import schema from './samples/seasonal-assistant.schema.json';
import { modelToFlow } from './transformers/model-to-flow';
import { Model } from './index';

describe('modelToFlow', () => {
  it('should create a full flow DSL from a model', async () => {
    const code = await modelToFlow(schema as Model);

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
} from '@auto-engineer/flow';
import type { Command, Event, State } from '@auto-engineer/flow';
import { AI, ProductCatalog } from '../server/src/integrations';
import type { Products } from '../server/src/integrations';
type EnterShoppingCriteria = Command<
  'EnterShoppingCriteria',
  {
    sessionId: string;
    criteria: string;
  }
>;
type ShoppingCriteriaEntered = Event<
  'ShoppingCriteriaEntered',
  {
    sessionId: string;
    criteria: string;
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

  it('should handle experience slices in model to flow conversion', async () => {
    const experienceModel: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Test Experience Flow',
          id: 'TEST-001',
          slices: [
            {
              name: 'Homepage',
              id: 'EXP-001',
              type: 'experience',
              client: {
                specs: {
                  name: '',
                  rules: ['show a hero section with a welcome message', 'allow user to start the questionnaire'],
                },
              },
            },
          ],
        },
      ],
      messages: [],
      integrations: [],
    };

    const code = await modelToFlow(experienceModel);

    expect(code).toEqual(`import { experience, flow, should, specs } from '@auto-engineer/flow';
flow('Test Experience Flow', 'TEST-001', () => {
  experience('Homepage', 'EXP-001').client(() => {
    specs(() => {
      should('show a hero section with a welcome message');
      should('allow user to start the questionnaire');
    });
  });
});
`);
  });

  it('should handle flows and slices without IDs', async () => {
    const modelWithoutIds: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Test Flow without IDs',
          // id: undefined - no ID
          slices: [
            {
              name: 'Homepage',
              // id: undefined - no ID
              type: 'experience',
              client: {
                specs: {
                  name: 'Homepage specs',
                  rules: ['show welcome message', 'display navigation'],
                },
              },
            },
          ],
        },
      ],
      messages: [],
      integrations: [],
    };

    const code = await modelToFlow(modelWithoutIds);

    expect(code).toEqual(`import { experience, flow, should, specs } from '@auto-engineer/flow';
flow('Test Flow without IDs', () => {
  experience('Homepage').client(() => {
    specs('Homepage specs', () => {
      should('show welcome message');
      should('display navigation');
    });
  });
});
`);
  });

  it('should include flow and slice IDs in generated code', async () => {
    const modelWithIds: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Test Flow with IDs',
          id: 'FLOW-123',
          slices: [
            {
              name: 'Homepage',
              id: 'SLICE-ABC',
              type: 'experience',
              client: {
                specs: {
                  name: 'Homepage specs',
                  rules: ['show welcome message', 'display navigation'],
                },
              },
            },
            {
              name: 'view products',
              id: 'SLICE-XYZ',
              type: 'query',
              client: {
                description: 'Product query client',
                specs: {
                  name: 'Product list specs',
                  rules: ['display all products', 'allow filtering'],
                },
              },
              server: {
                description: 'Product query server',
                specs: {
                  name: 'Product data specs',
                  rules: [],
                },
              },
            },
          ],
        },
      ],
      messages: [],
      integrations: [],
    };

    const code = await modelToFlow(modelWithIds);

    expect(code).toEqual(`import { experience, flow, query, should, specs } from '@auto-engineer/flow';
flow('Test Flow with IDs', 'FLOW-123', () => {
  experience('Homepage', 'SLICE-ABC').client(() => {
    specs('Homepage specs', () => {
      should('show welcome message');
      should('display navigation');
    });
  });
  query('view products', 'SLICE-XYZ')
    .client(() => {
      specs('Product list specs', () => {
        should('display all products');
        should('allow filtering');
      });
    })
    .server(() => {});
});
`);
  });

  it('should include rule IDs in server specs when present', async () => {
    const modelWithRuleIds: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Test Flow with Rule IDs',
          id: 'FLOW-456',
          slices: [
            {
              name: 'process command',
              id: 'SLICE-789',
              type: 'command',
              client: {
                description: 'Command processing client',
              },
              server: {
                description: 'Command processing server',
                specs: {
                  name: 'Command Processing',
                  rules: [
                    {
                      id: 'RULE-ABC',
                      description: 'Valid commands should be processed',
                      examples: [
                        {
                          description: 'User submits valid command',
                          when: {
                            commandRef: 'ProcessCommand',
                            exampleData: { id: 'cmd-123', action: 'create' },
                          },
                          then: [
                            {
                              eventRef: 'CommandProcessed',
                              exampleData: { id: 'cmd-123', status: 'success' },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'command',
          name: 'ProcessCommand',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'action', type: 'string', required: true },
          ],
          metadata: { version: 1 },
        },
        {
          type: 'event',
          name: 'CommandProcessed',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
          ],
          source: 'external',
          metadata: { version: 1 },
        },
      ],
      integrations: [],
    };

    const code = await modelToFlow(modelWithRuleIds);

    expect(code).toEqual(`import { command, example, flow, rule, specs } from '@auto-engineer/flow';
import type { Command, Event } from '@auto-engineer/flow';
type ProcessCommand = Command<
  'ProcessCommand',
  {
    id: string;
    action: string;
  }
>;
type CommandProcessed = Event<
  'CommandProcessed',
  {
    id: string;
    status: string;
  }
>;
flow('Test Flow with Rule IDs', 'FLOW-456', () => {
  command('process command', 'SLICE-789').server(() => {
    specs('Command Processing', () => {
      rule('Valid commands should be processed', 'RULE-ABC', () => {
        example('User submits valid command')
          .when<ProcessCommand>({ id: 'cmd-123', action: 'create' })
          .then<CommandProcessed>({ id: 'cmd-123', status: 'success' });
      });
    });
  });
});
`);
  });

  it('should correctly resolve Date types in messages', async () => {
    const modelWithDateTypes: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Questionnaire Flow',
          id: 'QUEST-001',
          slices: [],
        },
      ],
      messages: [
        {
          type: 'event',
          name: 'QuestionnaireLinkSent',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'link', type: 'string', required: true },
            { name: 'sentAt', type: 'Date', required: true },
          ],
          source: 'external',
          metadata: { version: 1 },
        },
        {
          type: 'event',
          name: 'QuestionAnswered',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
            { name: 'savedAt', type: 'Date', required: true },
          ],
          source: 'external',
          metadata: { version: 1 },
        },
      ],
      integrations: [],
    };

    const code = await modelToFlow(modelWithDateTypes);

    expect(code).toEqual(`import { flow } from '@auto-engineer/flow';
import type { Event } from '@auto-engineer/flow';
type QuestionnaireLinkSent = Event<
  'QuestionnaireLinkSent',
  {
    questionnaireId: string;
    participantId: string;
    link: string;
    sentAt: Date;
  }
>;
type QuestionAnswered = Event<
  'QuestionAnswered',
  {
    questionnaireId: string;
    participantId: string;
    questionId: string;
    answer: unknown;
    savedAt: Date;
  }
>;
flow('Questionnaire Flow', 'QUEST-001', () => {});
`);
  });

  it('should generate browser-compatible imports without mixing values and types', async () => {
    const questionnairesModel: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Questionnaires',
          id: 'AUTO-Q9m2Kp4Lx',
          slices: [
            {
              name: 'Homepage',
              id: 'AUTO-H1a4Bn6Cy',
              type: 'experience',
              client: {
                specs: {
                  name: '',
                  rules: ['show a hero section with a welcome message', 'allow user to start the questionnaire'],
                },
              },
            },
            {
              name: 'views the questionnaire',
              id: 'AUTO-V7n8Rq5M',
              type: 'query',
              client: {
                description: '',
                specs: {
                  name: 'Questionnaire Progress',
                  rules: [
                    'focus on the current question based on the progress state',
                    'display the list of answered questions',
                    'display the list of remaining questions',
                    'show a progress indicator that is always visible as the user scrolls',
                  ],
                },
              },
              request:
                'query QuestionnaireProgress($participantId: ID!) {\n  questionnaireProgress(participantId: $participantId) {\n    questionnaireId\n    participantId\n    currentQuestionId\n    remainingQuestions\n    status\n    answers {\n      questionId\n      value\n    }\n  }\n}',
              server: {
                description: '',
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'QuestionnaireProgress',
                    },
                    origin: {
                      type: 'projection',
                      name: 'Questionnaires',
                      idField: 'questionnaire-participantId',
                    },
                  },
                ],
                specs: {
                  name: '',
                  rules: [
                    {
                      id: 'AUTO-r1A3Bp9W',
                      description: 'questionnaires show current progress',
                      examples: [
                        {
                          description: 'a question has already been answered',
                          given: [
                            {
                              eventRef: 'QuestionnaireLinkSent',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                link: 'https://app.example.com/q/q-001?participant=participant-abc',
                                sentAt: new Date('2030-01-01T09:00:00.000Z'),
                              },
                            },
                          ],
                          when: {
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                              questionId: 'q1',
                              answer: 'Yes',
                              savedAt: new Date('2030-01-01T09:05:00.000Z'),
                            },
                            eventRef: 'QuestionAnswered',
                          },
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                status: 'in_progress',
                                currentQuestionId: 'q2',
                                remainingQuestions: ['q2', 'q3'],
                                answers: [
                                  {
                                    questionId: 'q1',
                                    value: 'Yes',
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'event',
          name: 'QuestionnaireLinkSent',
          fields: [
            {
              name: 'questionnaireId',
              type: 'string',
              required: true,
            },
            {
              name: 'participantId',
              type: 'string',
              required: true,
            },
            {
              name: 'link',
              type: 'string',
              required: true,
            },
            {
              name: 'sentAt',
              type: 'Date',
              required: true,
            },
          ],
          source: 'internal',
          metadata: {
            version: 1,
          },
        },
        {
          type: 'event',
          name: 'QuestionAnswered',
          fields: [
            {
              name: 'questionnaireId',
              type: 'string',
              required: true,
            },
            {
              name: 'participantId',
              type: 'string',
              required: true,
            },
            {
              name: 'questionId',
              type: 'string',
              required: true,
            },
            {
              name: 'answer',
              type: 'unknown',
              required: true,
            },
            {
              name: 'savedAt',
              type: 'Date',
              required: true,
            },
          ],
          source: 'internal',
          metadata: {
            version: 1,
          },
        },
        {
          type: 'state',
          name: 'QuestionnaireProgress',
          fields: [
            {
              name: 'questionnaireId',
              type: 'string',
              required: true,
            },
            {
              name: 'participantId',
              type: 'string',
              required: true,
            },
            {
              name: 'status',
              type: '"in_progress" | "ready_to_submit" | "submitted"',
              required: true,
            },
            {
              name: 'currentQuestionId',
              type: 'string | null',
              required: true,
            },
            {
              name: 'remainingQuestions',
              type: 'Array<string>',
              required: true,
            },
            {
              name: 'answers',
              type: 'Array<{ questionId: string; value: unknown }>',
              required: true,
            },
          ],
          metadata: {
            version: 1,
          },
        },
      ],
      integrations: [],
    };

    const code = await modelToFlow(questionnairesModel);

    expect(code)
      .toEqual(`import { data, example, experience, flow, gql, query, rule, should, source, specs } from '@auto-engineer/flow';
import type { Event, State } from '@auto-engineer/flow';
type QuestionnaireLinkSent = Event<
  'QuestionnaireLinkSent',
  {
    questionnaireId: string;
    participantId: string;
    link: string;
    sentAt: Date;
  }
>;
type QuestionAnswered = Event<
  'QuestionAnswered',
  {
    questionnaireId: string;
    participantId: string;
    questionId: string;
    answer: unknown;
    savedAt: Date;
  }
>;
type QuestionnaireProgress = State<
  'QuestionnaireProgress',
  {
    questionnaireId: string;
    participantId: string;
    status: 'in_progress' | 'ready_to_submit' | 'submitted';
    currentQuestionId: string | null;
    remainingQuestions: string[];
    answers: {
      questionId: string;
      value: unknown;
    }[];
  }
>;
flow('Questionnaires', 'AUTO-Q9m2Kp4Lx', () => {
  experience('Homepage', 'AUTO-H1a4Bn6Cy').client(() => {
    specs(() => {
      should('show a hero section with a welcome message');
      should('allow user to start the questionnaire');
    });
  });
  query('views the questionnaire', 'AUTO-V7n8Rq5M')
    .client(() => {
      specs('Questionnaire Progress', () => {
        should('focus on the current question based on the progress state');
        should('display the list of answered questions');
        should('display the list of remaining questions');
        should('show a progress indicator that is always visible as the user scrolls');
      });
    })
    .request(
      gql(\`query QuestionnaireProgress($participantId: ID!) {
  questionnaireProgress(participantId: $participantId) {
    questionnaireId
    participantId
    currentQuestionId
    remainingQuestions
    status
    answers {
      questionId
      value
    }
  }
}\`),
    )
    .server(() => {
      data([source().state('QuestionnaireProgress').fromProjection('Questionnaires', 'questionnaire-participantId')]);
      specs(() => {
        rule('questionnaires show current progress', 'AUTO-r1A3Bp9W', () => {
          example('a question has already been answered')
            .given<QuestionnaireLinkSent>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              link: 'https://app.example.com/q/q-001?participant=participant-abc',
              sentAt: new Date('2030-01-01T09:00:00.000Z'),
            })
            .when<QuestionAnswered>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'q1',
              answer: 'Yes',
              savedAt: new Date('2030-01-01T09:05:00.000Z'),
            })
            .then<QuestionnaireProgress>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              status: 'in_progress',
              currentQuestionId: 'q2',
              remainingQuestions: ['q2', 'q3'],
              answers: [{ questionId: 'q1', value: 'Yes' }],
            });
        });
      });
    });
});
`);
  });

  it('should consolidate duplicate rules with multiple examples into single rule blocks', async () => {
    const modelWithDuplicateRules: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Test Flow',
          id: 'TEST-FLOW',
          slices: [
            {
              name: 'test slice',
              id: 'TEST-SLICE',
              type: 'query',
              client: {
                description: 'Test client for duplicate rules',
              },
              server: {
                description: 'Test server for duplicate rules',
                specs: {
                  name: 'Test Rules',
                  rules: [
                    {
                      id: 'AUTO-r1A3Bp9W',
                      description: 'questionnaires show current progress',
                      examples: [
                        {
                          description: 'a question has already been answered',
                          given: [
                            {
                              eventRef: 'QuestionnaireLinkSent',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                              },
                            },
                          ],
                          when: {
                            eventRef: 'QuestionAnswered',
                            exampleData: {
                              questionnaireId: 'q-001',
                              questionId: 'q1',
                              answer: 'Yes',
                            },
                          },
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                status: 'in_progress',
                              },
                            },
                          ],
                        },
                        {
                          description: 'no questions have been answered yet',
                          given: [
                            {
                              eventRef: 'QuestionnaireLinkSent',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                              },
                            },
                          ],
                          when: {
                            eventRef: 'QuestionnaireLinkSent',
                            exampleData: {},
                          },
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                status: 'in_progress',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'event',
          name: 'QuestionnaireLinkSent',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
          ],
          source: 'internal',
          metadata: { version: 1 },
        },
        {
          type: 'event',
          name: 'QuestionAnswered',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
          ],
          source: 'internal',
          metadata: { version: 1 },
        },
        {
          type: 'state',
          name: 'QuestionnaireProgress',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
          ],
          metadata: { version: 1 },
        },
      ],
      integrations: [],
    };

    const code = await modelToFlow(modelWithDuplicateRules);

    expect(code).toEqual(`import { example, flow, query, rule, specs } from '@auto-engineer/flow';
import type { Event, State } from '@auto-engineer/flow';
type QuestionnaireLinkSent = Event<
  'QuestionnaireLinkSent',
  {
    questionnaireId: string;
    participantId: string;
  }
>;
type QuestionAnswered = Event<
  'QuestionAnswered',
  {
    questionnaireId: string;
    questionId: string;
    answer: unknown;
  }
>;
type QuestionnaireProgress = State<
  'QuestionnaireProgress',
  {
    questionnaireId: string;
    status: string;
  }
>;
flow('Test Flow', 'TEST-FLOW', () => {
  query('test slice', 'TEST-SLICE').server(() => {
    specs('Test Rules', () => {
      rule('questionnaires show current progress', 'AUTO-r1A3Bp9W', () => {
        example('a question has already been answered')
          .given<QuestionnaireLinkSent>({ questionnaireId: 'q-001', participantId: 'participant-abc' })
          .when<QuestionAnswered>({ questionnaireId: 'q-001', questionId: 'q1', answer: 'Yes' })
          .then<QuestionnaireProgress>({ questionnaireId: 'q-001', status: 'in_progress' });
        example('no questions have been answered yet')
          .given<QuestionnaireLinkSent>({ questionnaireId: 'q-001', participantId: 'participant-abc' })
          .when<QuestionnaireLinkSent>({})
          .then<QuestionnaireProgress>({ questionnaireId: 'q-001', status: 'in_progress' });
      });
    });
  });
});
`);
  });

  it('should chain multiple given examples with .and() syntax', async () => {
    const modelWithMultiGiven: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Multi Given Flow',
          id: 'MULTI-GIVEN',
          slices: [
            {
              name: 'multi given slice',
              id: 'MULTI-SLICE',
              type: 'query',
              client: {
                description: 'Multi given client',
              },
              server: {
                description: 'Multi given server rules',
                specs: {
                  name: 'Multi Given Rules',
                  rules: [
                    {
                      id: 'AUTO-MultiGiven',
                      description: 'all questions have been answered',
                      examples: [
                        {
                          description: 'questionnaire with multiple events',
                          given: [
                            {
                              stateRef: 'QuestionnaireConfig',
                              exampleData: {
                                questionnaireId: 'q-001',
                                numberOfQuestions: 3,
                              },
                            },
                            {
                              eventRef: 'QuestionnaireLinkSent',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                link: 'https://example.com/q/q-001',
                                sentAt: new Date('2030-01-01T09:00:00.000Z'),
                              },
                            },
                            {
                              eventRef: 'QuestionAnswered',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                questionId: 'q1',
                                answer: 'Yes',
                                savedAt: new Date('2030-01-01T09:05:00.000Z'),
                              },
                            },
                            {
                              eventRef: 'QuestionAnswered',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                questionId: 'q2',
                                answer: 'No',
                                savedAt: new Date('2030-01-01T09:10:00.000Z'),
                              },
                            },
                          ],
                          when: {
                            eventRef: 'QuestionAnswered',
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                              questionId: 'q3',
                              answer: 'Maybe',
                              savedAt: new Date('2030-01-01T09:15:00.000Z'),
                            },
                          },
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                status: 'ready_to_submit',
                                currentQuestionId: null,
                                remainingQuestions: [],
                                answers: [
                                  { questionId: 'q1', value: 'Yes' },
                                  { questionId: 'q2', value: 'No' },
                                ],
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'state',
          name: 'QuestionnaireConfig',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'numberOfQuestions', type: 'number', required: true },
          ],
          metadata: { version: 1 },
        },
        {
          type: 'event',
          name: 'QuestionnaireLinkSent',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'link', type: 'string', required: true },
            { name: 'sentAt', type: 'Date', required: true },
          ],
          source: 'internal',
          metadata: { version: 1 },
        },
        {
          type: 'event',
          name: 'QuestionAnswered',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
            { name: 'savedAt', type: 'Date', required: true },
          ],
          source: 'internal',
          metadata: { version: 1 },
        },
        {
          type: 'state',
          name: 'QuestionnaireProgress',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'status', type: '"in_progress" | "ready_to_submit" | "submitted"', required: true },
            { name: 'currentQuestionId', type: 'string | null', required: true },
            { name: 'remainingQuestions', type: 'Array<string>', required: true },
            { name: 'answers', type: 'Array<{ questionId: string; value: unknown }>', required: true },
          ],
          metadata: { version: 1 },
        },
      ],
      integrations: [],
    };

    const code = await modelToFlow(modelWithMultiGiven);

    expect(code).toEqual(`import { example, flow, query, rule, specs } from '@auto-engineer/flow';
import type { Event, State } from '@auto-engineer/flow';
type QuestionnaireConfig = State<
  'QuestionnaireConfig',
  {
    questionnaireId: string;
    numberOfQuestions: number;
  }
>;
type QuestionnaireLinkSent = Event<
  'QuestionnaireLinkSent',
  {
    questionnaireId: string;
    participantId: string;
    link: string;
    sentAt: Date;
  }
>;
type QuestionAnswered = Event<
  'QuestionAnswered',
  {
    questionnaireId: string;
    participantId: string;
    questionId: string;
    answer: unknown;
    savedAt: Date;
  }
>;
type QuestionnaireProgress = State<
  'QuestionnaireProgress',
  {
    questionnaireId: string;
    participantId: string;
    status: 'in_progress' | 'ready_to_submit' | 'submitted';
    currentQuestionId: string | null;
    remainingQuestions: string[];
    answers: {
      questionId: string;
      value: unknown;
    }[];
  }
>;
flow('Multi Given Flow', 'MULTI-GIVEN', () => {
  query('multi given slice', 'MULTI-SLICE').server(() => {
    specs('Multi Given Rules', () => {
      rule('all questions have been answered', 'AUTO-MultiGiven', () => {
        example('questionnaire with multiple events')
          .given<QuestionnaireConfig>({ questionnaireId: 'q-001', numberOfQuestions: 3 })
          .and<QuestionnaireLinkSent>({
            questionnaireId: 'q-001',
            participantId: 'participant-abc',
            link: 'https://example.com/q/q-001',
            sentAt: new Date('2030-01-01T09:00:00.000Z'),
          })
          .and<QuestionAnswered>({
            questionnaireId: 'q-001',
            participantId: 'participant-abc',
            questionId: 'q1',
            answer: 'Yes',
            savedAt: new Date('2030-01-01T09:05:00.000Z'),
          })
          .and<QuestionAnswered>({
            questionnaireId: 'q-001',
            participantId: 'participant-abc',
            questionId: 'q2',
            answer: 'No',
            savedAt: new Date('2030-01-01T09:10:00.000Z'),
          })
          .when<QuestionAnswered>({
            questionnaireId: 'q-001',
            participantId: 'participant-abc',
            questionId: 'q3',
            answer: 'Maybe',
            savedAt: new Date('2030-01-01T09:15:00.000Z'),
          })
          .then<QuestionnaireProgress>({
            questionnaireId: 'q-001',
            participantId: 'participant-abc',
            status: 'ready_to_submit',
            currentQuestionId: null,
            remainingQuestions: [],
            answers: [
              { questionId: 'q1', value: 'Yes' },
              { questionId: 'q2', value: 'No' },
            ],
          });
      });
    });
  });
});
`);
  });

  it('should generate types for states referenced in data origins', async () => {
    const modelWithReferencedStates: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Referenced States Flow',
          id: 'REF-STATES',
          slices: [
            {
              name: 'query with database states',
              id: 'REF-SLICE',
              type: 'query',
              client: {
                description: 'Client for referenced states',
              },
              server: {
                description: 'Server for referenced states',
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'QuestionnaireProgress',
                    },
                    origin: {
                      type: 'projection',
                      name: 'QuestionnaireProjection',
                      idField: 'participantId',
                    },
                  },
                  {
                    target: {
                      type: 'State',
                      name: 'QuestionnaireConfig',
                    },
                    origin: {
                      type: 'database',
                      collection: 'ConfigStore',
                      query: { questionnaireId: '$questionnaireId' },
                    },
                  },
                ],
                specs: {
                  name: 'Database State Rules',
                  rules: [
                    {
                      id: 'AUTO-RefState',
                      description: 'questionnaire config is available when referenced',
                      examples: [
                        {
                          description: 'config from database is accessible',
                          given: [
                            {
                              stateRef: 'QuestionnaireConfig',
                              exampleData: {
                                questionnaireId: 'q-001',
                                numberOfQuestions: 5,
                                title: 'Customer Satisfaction Survey',
                              },
                            },
                          ],
                          when: {
                            eventRef: 'QuestionnaireProgress',
                            exampleData: {},
                          },
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                status: 'in_progress',
                                totalQuestions: 5,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'state',
          name: 'QuestionnaireProgress',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'status', type: 'string', required: true },
            { name: 'totalQuestions', type: 'number', required: true },
          ],
          metadata: { version: 1 },
        },
        {
          type: 'state',
          name: 'QuestionnaireConfig',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'numberOfQuestions', type: 'number', required: true },
            { name: 'title', type: 'string', required: true },
          ],
          metadata: { version: 1 },
        },
      ],
      integrations: [],
    };

    const code = await modelToFlow(modelWithReferencedStates);

    expect(code).toEqual(`import { data, example, flow, query, rule, source, specs } from '@auto-engineer/flow';
import type { State } from '@auto-engineer/flow';
type QuestionnaireProgress = State<
  'QuestionnaireProgress',
  {
    questionnaireId: string;
    participantId: string;
    status: string;
    totalQuestions: number;
  }
>;
type QuestionnaireConfig = State<
  'QuestionnaireConfig',
  {
    questionnaireId: string;
    numberOfQuestions: number;
    title: string;
  }
>;
flow('Referenced States Flow', 'REF-STATES', () => {
  query('query with database states', 'REF-SLICE').server(() => {
    data([
      source().state('QuestionnaireProgress').fromProjection('QuestionnaireProjection', 'participantId'),
      source().state('QuestionnaireConfig').fromDatabase('ConfigStore', { questionnaireId: '$questionnaireId' }),
    ]);
    specs('Database State Rules', () => {
      rule('questionnaire config is available when referenced', 'AUTO-RefState', () => {
        example('config from database is accessible')
          .given<QuestionnaireConfig>({
            questionnaireId: 'q-001',
            numberOfQuestions: 5,
            title: 'Customer Satisfaction Survey',
          })
          .when<QuestionnaireProgress>({})
          .then<QuestionnaireProgress>({
            questionnaireId: 'q-001',
            participantId: 'participant-abc',
            status: 'in_progress',
            totalQuestions: 5,
          });
      });
    });
  });
});
`);
  });

  it('should generate new Date() constructors for Date fields', async () => {
    const modelWithDateFields: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Date Handling Flow',
          id: 'DATE-FLOW',
          slices: [
            {
              name: 'date handling slice',
              id: 'DATE-SLICE',
              type: 'query',
              client: {
                description: 'Date client',
              },
              server: {
                description: 'Date server with Date fields',
                specs: {
                  name: 'Date Field Rules',
                  rules: [
                    {
                      id: 'AUTO-DateRule',
                      description: 'handles Date fields correctly',
                      examples: [
                        {
                          description: 'event with Date fields',
                          given: [
                            {
                              eventRef: 'TimestampedEvent',
                              exampleData: {
                                id: 'event-123',
                                sentAt: new Date('2030-01-01T09:00:00.000Z'),
                                savedAt: new Date('2030-01-01T09:05:00.000Z'),
                                attemptedAt: '2030-01-01T09:10:00.000Z',
                                submittedAt: '2030-01-01T09:15:00.000Z',
                              },
                            },
                          ],
                          when: {
                            eventRef: 'ProcessEvent',
                            exampleData: {
                              processedAt: '2030-01-01T10:00:00.000Z',
                            },
                          },
                          then: [
                            {
                              stateRef: 'ProcessState',
                              exampleData: {
                                id: 'state-123',
                                completedAt: '2030-01-01T11:00:00.000Z',
                                status: 'completed',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'event',
          name: 'TimestampedEvent',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'sentAt', type: 'Date', required: true },
            { name: 'savedAt', type: 'Date', required: true },
            { name: 'attemptedAt', type: 'Date', required: true },
            { name: 'submittedAt', type: 'Date', required: true },
          ],
          source: 'internal',
          metadata: { version: 1 },
        },
        {
          type: 'event',
          name: 'ProcessEvent',
          fields: [{ name: 'processedAt', type: 'Date', required: true }],
          source: 'internal',
          metadata: { version: 1 },
        },
        {
          type: 'state',
          name: 'ProcessState',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'completedAt', type: 'Date', required: true },
            { name: 'status', type: 'string', required: true },
          ],
          metadata: { version: 1 },
        },
      ],
      integrations: [],
    };

    const code = await modelToFlow(modelWithDateFields);

    expect(code).toEqual(`import { example, flow, query, rule, specs } from '@auto-engineer/flow';
import type { Event, State } from '@auto-engineer/flow';
type TimestampedEvent = Event<
  'TimestampedEvent',
  {
    id: string;
    sentAt: Date;
    savedAt: Date;
    attemptedAt: Date;
    submittedAt: Date;
  }
>;
type ProcessEvent = Event<
  'ProcessEvent',
  {
    processedAt: Date;
  }
>;
type ProcessState = State<
  'ProcessState',
  {
    id: string;
    completedAt: Date;
    status: string;
  }
>;
flow('Date Handling Flow', 'DATE-FLOW', () => {
  query('date handling slice', 'DATE-SLICE').server(() => {
    specs('Date Field Rules', () => {
      rule('handles Date fields correctly', 'AUTO-DateRule', () => {
        example('event with Date fields')
          .given<TimestampedEvent>({
            id: 'event-123',
            sentAt: new Date('2030-01-01T09:00:00.000Z'),
            savedAt: new Date('2030-01-01T09:05:00.000Z'),
            attemptedAt: new Date('2030-01-01T09:10:00.000Z'),
            submittedAt: new Date('2030-01-01T09:15:00.000Z'),
          })
          .when<ProcessEvent>({ processedAt: new Date('2030-01-01T10:00:00.000Z') })
          .then<ProcessState>({
            id: 'state-123',
            completedAt: new Date('2030-01-01T11:00:00.000Z'),
            status: 'completed',
          });
      });
    });
  });
});
`);
  });

  it('should generate multiple flows when multiple flows have the same sourceFile', async () => {
    const modelWithMultipleFlowsSameSource: Model = {
      variant: 'specs',
      flows: [
        {
          name: 'Home Screen',
          sourceFile: '/path/to/homepage.flow.ts',
          slices: [
            {
              name: 'Active Surveys Summary',
              id: 'AUTO-aifPcU3hw',
              type: 'experience',
              client: {
                specs: {
                  name: '',
                  rules: ['show active surveys summary'],
                },
              },
            },
          ],
        },
        {
          name: 'Create Survey',
          sourceFile: '/path/to/homepage.flow.ts',
          slices: [
            {
              name: 'Create Survey Form',
              id: 'AUTO-MPviTMrQC',
              type: 'experience',
              client: {
                specs: {
                  name: '',
                  rules: ['allow entering survey title'],
                },
              },
            },
          ],
        },
        {
          name: 'Response Analytics',
          sourceFile: '/path/to/homepage.flow.ts',
          slices: [
            {
              name: 'Response Rate Charts',
              id: 'AUTO-eME978Euk',
              type: 'experience',
              client: {
                specs: {
                  name: '',
                  rules: ['show daily response rate charts'],
                },
              },
            },
          ],
        },
      ],
      messages: [],
      integrations: [],
    };

    const code = await modelToFlow(modelWithMultipleFlowsSameSource);

    expect(code).toEqual(`import { experience, flow, should, specs } from '@auto-engineer/flow';
flow('Home Screen', () => {
  experience('Active Surveys Summary', 'AUTO-aifPcU3hw').client(() => {
    specs(() => {
      should('show active surveys summary');
    });
  });
});
flow('Create Survey', () => {
  experience('Create Survey Form', 'AUTO-MPviTMrQC').client(() => {
    specs(() => {
      should('allow entering survey title');
    });
  });
});
flow('Response Analytics', () => {
  experience('Response Rate Charts', 'AUTO-eME978Euk').client(() => {
    specs(() => {
      should('show daily response rate charts');
    });
  });
});
`);
  });
});
