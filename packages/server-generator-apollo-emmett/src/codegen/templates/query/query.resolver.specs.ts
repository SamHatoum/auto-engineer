import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { Model as SpecsSchema } from '@auto-engineer/flow';

describe('query.resolver.ts.ejs', () => {
  it('should generate a valid query resolver from request field', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'listing-flow',
          slices: [
            {
              type: 'query',
              name: 'search-listings',
              request: `
                query SearchProperties($location: String, $maxPrice: Float, $minGuests: Int) {
                  searchProperties(location: $location, maxPrice: $maxPrice, minGuests: $minGuests) {
                    propertyId
                    title
                    pricePerNight
                    location
                    maxGuests
                  }
                }
              `,
              client: {
                description: '',
              },
              server: {
                description: '',
                data: [
                  {
                    origin: {
                      type: 'projection',
                      idField: 'propertyId',
                      name: 'AvailablePropertiesProjection',
                    },
                    target: {
                      type: 'State',
                      name: 'AvailableListings',
                    },
                  },
                ],
                specs: { name: '', rules: [] },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'state',
          name: 'AvailableListings',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'pricePerNight', type: 'number', required: true },
            { name: 'location', type: 'string', required: true },
            { name: 'maxGuests', type: 'number', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const resolverFile = plans.find((p) => p.outputPath.endsWith('query.resolver.ts'));

    expect(resolverFile?.contents).toMatchInlineSnapshot(`
      "import { Query, Resolver, Arg, Ctx, ObjectType, Field, Float } from 'type-graphql';
      import { type GraphQLContext, ReadModel } from '../../../shared';

      @ObjectType()
      export class AvailableListings {
        @Field(() => String)
        propertyId!: string;

        @Field(() => String)
        title!: string;

        @Field(() => Float)
        pricePerNight!: number;

        @Field(() => String)
        location!: string;

        @Field(() => Float)
        maxGuests!: number;

        // IMPORTANT: Index signature required for ReadModel<T extends Record<string, unknown>> compatibility
        [key: string]: unknown;
      }

      @Resolver()
      export class SearchListingsQueryResolver {
        @Query(() => [AvailableListings])
        async searchProperties(
          @Ctx() ctx: GraphQLContext,
          @Arg('location', () => String, { nullable: true }) location?: string,
          @Arg('maxPrice', () => Float, { nullable: true }) maxPrice?: number,
          @Arg('minGuests', () => Float, { nullable: true }) minGuests?: number,
        ): Promise<AvailableListings[]> {
          const model = new ReadModel<AvailableListings>(ctx.database, 'AvailablePropertiesProjection');

          // ## IMPLEMENTATION INSTRUCTIONS ##
          // You can query the projection using the ReadModel API:
          // - model.getAll() — fetch all documents
          // - model.getById(id) — fetch a single document by ID (default key: 'id')
          // - model.find(filterFn) — filter documents using a predicate
          // - model.first(filterFn) — fetch the first document matching a predicate
          //
          // Example below uses \\\`.find()\\\` to filter
          // change the logic for the query as needed to meet the requirements for the current slice.

          return model.find((item) => {
            if (location !== undefined && item.location !== location) return false;

            if (maxPrice !== undefined && item.maxPrice !== maxPrice) return false;

            if (minGuests !== undefined && item.minGuests !== minGuests) return false;

            return true;
          });
        }
      }
      "
    `);
  });
  it('should generate a valid query resolver with array of inline object field', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'assistant-flow',
          slices: [
            {
              type: 'query',
              name: 'views-suggested-items',
              request: `
              query GetSuggestedItems($sessionId: ID!) {
                suggestedItems(sessionId: $sessionId) {
                  sessionId
                  items {
                    productId
                    name
                    quantity
                    reason
                  }
                }
              }
            `,
              client: { description: '' },
              server: {
                description: '',
                data: [
                  {
                    origin: {
                      type: 'projection',
                      idField: 'sessionId',
                      name: 'SuggestedItemsProjection',
                    },
                    target: {
                      type: 'State',
                      name: 'SuggestedItems',
                    },
                  },
                ],
                specs: { name: '', rules: [] },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'state',
          name: 'SuggestedItems',
          fields: [
            { name: 'sessionId', type: 'string', required: true },
            {
              name: 'items',
              type: 'Array<{ productId: string; name: string; quantity: number; reason: string }>',
              required: true,
            },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const resolverFile = plans.find((p) => p.outputPath.endsWith('query.resolver.ts'));

    expect(resolverFile?.contents).toMatchInlineSnapshot(`
      "import { Query, Resolver, Arg, Ctx, ObjectType, Field, ID, Float } from 'type-graphql';
      import { GraphQLJSON } from 'graphql-type-json';
      import { type GraphQLContext, ReadModel } from '../../../shared';

      @ObjectType()
      export class SuggestedItemsItems {
        @Field(() => String)
        productId!: string;

        @Field(() => String)
        name!: string;

        @Field(() => Float)
        quantity!: number;

        @Field(() => String)
        reason!: string;
      }

      @ObjectType()
      export class SuggestedItems {
        @Field(() => String)
        sessionId!: string;

        @Field(() => [SuggestedItemsItems])
        items!: SuggestedItemsItems[];

        // IMPORTANT: Index signature required for ReadModel<T extends Record<string, unknown>> compatibility
        [key: string]: unknown;
      }

      @Resolver()
      export class ViewsSuggestedItemsQueryResolver {
        @Query(() => [SuggestedItems])
        async suggestedItems(
          @Ctx() ctx: GraphQLContext,
          @Arg('sessionId', () => ID, { nullable: true }) sessionId?: string,
        ): Promise<SuggestedItems[]> {
          const model = new ReadModel<SuggestedItems>(ctx.database, 'SuggestedItemsProjection');

          // ## IMPLEMENTATION INSTRUCTIONS ##
          // You can query the projection using the ReadModel API:
          // - model.getAll() — fetch all documents
          // - model.getById(id) — fetch a single document by ID (default key: 'id')
          // - model.find(filterFn) — filter documents using a predicate
          // - model.first(filterFn) — fetch the first document matching a predicate
          //
          // Example below uses \\\`.find()\\\` to filter
          // change the logic for the query as needed to meet the requirements for the current slice.

          return model.find((item) => {
            if (sessionId !== undefined && item.sessionId !== sessionId) return false;

            return true;
          });
        }
      }
      "
    `);
  });
  it('should generate the query resolver for "views the questionnaire"', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Questionnaires',
          slices: [
            {
              name: 'views the questionnaire',
              type: 'query',
              client: {
                description: '',
                specs: {
                  name: '',
                  rules: [
                    'focus on the current question based on the progress state',
                    'display the list of answered questions',
                    'display the list of remaining questions',
                    'show a progress indicator that is always visible as the user scrolls',
                  ],
                },
              },
              request:
                'query QuestionnaireProgress($participantId: ID!) {\n  questionnaireProgress(participantId: $participantId) {\n    questionnaireId\n    participantId\n    status\n    currentQuestionId\n    remainingQuestions\n    answers {\n      questionId\n      value\n    }\n  }\n}',
              server: {
                description: '',
                data: [
                  {
                    target: { type: 'State', name: 'QuestionnaireProgress' },
                    origin: { type: 'projection', name: 'Questionnaires', idField: 'questionnaire-participantId' },
                  },
                ],
                specs: {
                  name: '',
                  rules: [
                    {
                      description: 'questionnaires show current progress',
                      examples: [
                        {
                          description: 'a question has already been answered',
                          given: [
                            {
                              eventRef: 'QuestionAnswered',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                link: 'https://app.example.com/q/q-001?participant=participant-abc',
                                sentAt: '2030-01-01T09:00:00.000Z',
                              },
                            },
                            {
                              eventRef: 'QuestionAnswered',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                questionId: 'q1',
                                answer: 'Yes',
                                savedAt: '2030-01-01T09:05:00.000Z',
                              },
                            },
                          ],
                          when: { exampleData: {}, eventRef: 'QuestionnaireLinkSent' },
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                status: 'in_progress',
                                currentQuestionId: 'q2',
                                remainingQuestions: ['q2', 'q3'],
                                answers: [{ questionId: 'q1', value: 'Yes' }],
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

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const queryFile = plans.find(
      (p) => p.outputPath.endsWith('query.resolver.ts') && p.contents.includes('ViewsTheQuestionnaireQueryResolver'),
    );

    expect(queryFile?.contents).toMatchInlineSnapshot(`
      "import { Query, Resolver, Arg, Ctx, ObjectType, Field, ID } from 'type-graphql';
      import { GraphQLJSON } from 'graphql-type-json';
      import { type GraphQLContext, ReadModel, QuestionnaireProgressStatus } from '../../../shared';

      @ObjectType()
      export class QuestionnaireProgressAnswers {
        @Field(() => String)
        questionId!: string;

        @Field(() => GraphQLJSON)
        value!: unknown;
      }

      @ObjectType()
      export class QuestionnaireProgress {
        @Field(() => String)
        questionnaireId!: string;

        @Field(() => String)
        participantId!: string;

        @Field(() => QuestionnaireProgressStatus)
        status!: QuestionnaireProgressStatus;

        @Field(() => String, { nullable: true })
        currentQuestionId?: string | null;

        @Field(() => [String])
        remainingQuestions!: string[];

        @Field(() => [QuestionnaireProgressAnswers])
        answers!: QuestionnaireProgressAnswers[];

        // IMPORTANT: Index signature required for ReadModel<T extends Record<string, unknown>> compatibility
        [key: string]: unknown;
      }

      @Resolver()
      export class ViewsTheQuestionnaireQueryResolver {
        @Query(() => [QuestionnaireProgress])
        async questionnaireProgress(
          @Ctx() ctx: GraphQLContext,
          @Arg('participantId', () => ID, { nullable: true }) participantId?: string,
        ): Promise<QuestionnaireProgress[]> {
          const model = new ReadModel<QuestionnaireProgress>(ctx.database, 'Questionnaires');

          // ## IMPLEMENTATION INSTRUCTIONS ##
          // You can query the projection using the ReadModel API:
          // - model.getAll() — fetch all documents
          // - model.getById(id) — fetch a single document by ID (default key: 'id')
          // - model.find(filterFn) — filter documents using a predicate
          // - model.first(filterFn) — fetch the first document matching a predicate
          //
          // Example below uses \\\`.find()\\\` to filter
          // change the logic for the query as needed to meet the requirements for the current slice.

          return model.find((item) => {
            if (participantId !== undefined && item.participantId !== participantId) return false;

            return true;
          });
        }
      }
      "
    `);
  });
  it('should import Float when Float fields are used', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'product-flow',
          slices: [
            {
              type: 'query',
              name: 'get-product-price',
              request: `
                query GetProductPrice($productId: ID!) {
                  productPrice(productId: $productId) {
                    productId
                    price
                    discount
                  }
                }
              `,
              client: {
                description: '',
              },
              server: {
                description: '',
                data: [
                  {
                    origin: {
                      type: 'projection',
                      idField: 'productId',
                      name: 'ProductPricesProjection',
                    },
                    target: {
                      type: 'State',
                      name: 'ProductPrice',
                    },
                  },
                ],
                specs: { name: '', rules: [] },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'state',
          name: 'ProductPrice',
          fields: [
            { name: 'productId', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'discount', type: 'number', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const resolverFile = plans.find((p) => p.outputPath.endsWith('query.resolver.ts'));

    expect(resolverFile?.contents).toContain(
      "import { Query, Resolver, Arg, Ctx, ObjectType, Field, ID, Float } from 'type-graphql';",
    );
    expect(resolverFile?.contents).toContain('@Field(() => Float)');
  });
  it('should import Float when array of numbers is used', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'stats-flow',
          slices: [
            {
              type: 'query',
              name: 'get-stats',
              request: `
                query GetStats($userId: ID!) {
                  stats(userId: $userId) {
                    userId
                    scores
                  }
                }
              `,
              client: {
                description: '',
              },
              server: {
                description: '',
                data: [
                  {
                    origin: {
                      type: 'projection',
                      idField: 'userId',
                      name: 'StatsProjection',
                    },
                    target: {
                      type: 'State',
                      name: 'Stats',
                    },
                  },
                ],
                specs: { name: '', rules: [] },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'state',
          name: 'Stats',
          fields: [
            { name: 'userId', type: 'string', required: true },
            { name: 'scores', type: 'Array<number>', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const resolverFile = plans.find((p) => p.outputPath.endsWith('query.resolver.ts'));

    expect(resolverFile?.contents).toContain('Float');
    expect(resolverFile?.contents).toContain('@Field(() => [Float])');
  });
  it('should import Float when Float query arg is used', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'search-flow',
          slices: [
            {
              type: 'query',
              name: 'search-products',
              request: `
                query SearchProducts($minPrice: Float, $maxPrice: Float) {
                  searchProducts(minPrice: $minPrice, maxPrice: $maxPrice) {
                    productId
                    name
                  }
                }
              `,
              client: {
                description: '',
              },
              server: {
                description: '',
                data: [
                  {
                    origin: {
                      type: 'projection',
                      idField: 'productId',
                      name: 'ProductsProjection',
                    },
                    target: {
                      type: 'State',
                      name: 'Product',
                    },
                  },
                ],
                specs: { name: '', rules: [] },
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'state',
          name: 'Product',
          fields: [
            { name: 'productId', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const resolverFile = plans.find((p) => p.outputPath.endsWith('query.resolver.ts'));

    expect(resolverFile?.contents).toContain('Float');
    expect(resolverFile?.contents).toContain("@Arg('minPrice', () => Float");
  });
});
