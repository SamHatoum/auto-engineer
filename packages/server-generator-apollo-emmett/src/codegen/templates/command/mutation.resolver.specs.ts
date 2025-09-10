import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { Model as SpecsSchema } from '@auto-engineer/flow';

describe('mutation.resolver.ts.ejs', () => {
  it('should generate a valid mutation resolver file', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Host creates a listing',
          slices: [
            {
              type: 'command',
              name: 'Create listing',
              client: {
                description: 'A form that allows users to add a new listing',
              },
              server: {
                description: 'Handles listing creation',
                specs: {
                  name: 'Create listing command',
                  rules: [
                    {
                      description: 'Should create listing successfully',
                      examples: [
                        {
                          description: 'User creates listing with valid data',
                          when: {
                            commandRef: 'CreateListing',
                            exampleData: {
                              propertyId: 'listing_123',
                              title: 'Modern Downtown Apartment',
                              pricePerNight: 250,
                              maxGuests: 4,
                              amenities: ['wifi', 'kitchen'],
                              available: true,
                              tags: ['sea view', 'balcony'],
                              rating: 4.8,
                              metadata: { petsAllowed: true },
                              listedAt: '2024-01-15T10:00:00Z',
                            },
                          },
                          then: [],
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
          name: 'CreateListing',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'pricePerNight', type: 'number', required: true },
            { name: 'maxGuests', type: 'number', required: true },
            { name: 'amenities', type: 'string[]', required: true },
            { name: 'available', type: 'boolean', required: true },
            { name: 'tags', type: 'string[]', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'metadata', type: 'object', required: true },
            { name: 'listedAt', type: 'Date', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const mutationFile = plans.find((p) => p.outputPath.endsWith('mutation.resolver.ts'));

    expect(mutationFile?.contents).toMatchInlineSnapshot(`
      "import { Mutation, Resolver, Arg, Ctx, Field, InputType, GraphQLISODateTime } from 'type-graphql';
      import GraphQLJSON from 'graphql-type-json';
      import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

      @InputType()
      export class CreateListingInput {
        @Field(() => String)
        propertyId!: string;

        @Field(() => String)
        title!: string;

        @Field(() => Float)
        pricePerNight!: number;

        @Field(() => Float)
        maxGuests!: number;

        @Field(() => [String])
        amenities!: string[];

        @Field(() => Boolean)
        available!: boolean;

        @Field(() => [String])
        tags!: string[];

        @Field(() => Float)
        rating!: number;

        @Field(() => JSON)
        metadata!: object;

        @Field(() => GraphQLISODateTime)
        listedAt!: Date;
      }

      @Resolver()
      export class CreateListingResolver {
        @Mutation(() => MutationResponse)
        async createListing(
          @Arg('input', () => CreateListingInput) input: CreateListingInput,
          @Ctx() ctx: GraphQLContext,
        ): Promise<MutationResponse> {
          return await sendCommand(ctx.messageBus, {
            type: 'CreateListing',
            kind: 'Command',
            data: { ...input },
          });
        }
      }
      "
    `);
  });

  it('should generate the mutation resolver for AnswerQuestion', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Questionnaires',
          slices: [
            {
              name: 'submits a questionnaire answer',
              type: 'command',
              client: {
                description: '',
                specs: {
                  name: '',
                  rules: [
                    'display a success message when the answer is submitted',
                    'display an error message when the answer submission is rejected',
                  ],
                },
              },
              request:
                'mutation AnswerQuestion($input: AnswerQuestionInput!) {\\n  answerQuestion(input: $input) {\\n    success\\n  }\\n}',
              server: {
                description: '',
                data: [
                  {
                    target: { type: 'Event', name: 'QuestionAnswered' },
                    destination: { type: 'stream', pattern: 'questionnaire-participantId' },
                  },
                  {
                    target: { type: 'Event', name: 'QuestionnaireEditRejected' },
                    destination: { type: 'stream', pattern: 'questionnaire-participantId' },
                  },
                ],
                specs: {
                  name: '',
                  rules: [
                    {
                      description: 'answers are allowed while the questionnaire has not been submitted',
                      examples: [
                        {
                          description: 'no questions have been answered yet',
                          when: {
                            commandRef: 'AnswerQuestion',
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                              questionId: 'q1',
                              answer: 'Yes',
                            },
                          },
                          then: [
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
          name: 'AnswerQuestion',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
          ],
          metadata: { version: 1 },
        },
      ],
      integrations: [],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const mutationFile = plans.find(
      (p) =>
        p.outputPath.endsWith('mutation.resolver.ts') && p.contents.includes('export class AnswerQuestionResolver'),
    );

    expect(mutationFile?.contents).toMatchInlineSnapshot(`
      "import { Mutation, Resolver, Arg, Ctx, Field, InputType } from 'type-graphql';
      import GraphQLJSON from 'graphql-type-json';
      import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

      @InputType()
      export class AnswerQuestionInput {
        @Field(() => String)
        questionnaireId!: string;

        @Field(() => String)
        participantId!: string;

        @Field(() => String)
        questionId!: string;

        @Field(() => GraphQLJSON)
        answer!: unknown;
      }

      @Resolver()
      export class AnswerQuestionResolver {
        @Mutation(() => MutationResponse)
        async answerQuestion(
          @Arg('input', () => AnswerQuestionInput) input: AnswerQuestionInput,
          @Ctx() ctx: GraphQLContext,
        ): Promise<MutationResponse> {
          return await sendCommand(ctx.messageBus, {
            type: 'AnswerQuestion',
            kind: 'Command',
            data: { ...input },
          });
        }
      }
      "
    `);
  });

  it('generates nested input types for inline object arrays in a mutation', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Cart',
          slices: [
            {
              type: 'command',
              name: 'Add items to cart',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: '',
                  rules: [
                    {
                      description: 'add items',
                      examples: [
                        {
                          description: 'happy path',
                          when: {
                            commandRef: 'AddItemsToCart',
                            exampleData: {
                              sessionId: 's-1',
                              items: [{ productId: 'p1', quantity: 2 }],
                            },
                          },
                          then: [],
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
          name: 'AddItemsToCart',
          fields: [
            { name: 'sessionId', type: 'string', required: true },
            { name: 'items', type: 'Array<{ productId: string; quantity: number }>', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const mutationFile = plans.find(
      (p) =>
        p.outputPath.endsWith('mutation.resolver.ts') && p.contents.includes('export class AddItemsToCartResolver'),
    );

    expect(mutationFile?.contents).toMatchInlineSnapshot(`
"import { Mutation, Resolver, Arg, Ctx, Field, InputType } from 'type-graphql';
import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

@InputType()
export class AddItemsToCartItemsInput {
  @Field(() => String)
  productId!: string;

  @Field(() => Float)
  quantity!: number;
}

@InputType()
export class AddItemsToCartInput {
  @Field(() => String)
  sessionId!: string;

  @Field(() => [AddItemsToCartItemsInput])
  items!: AddItemsToCartItemsInput[];
}

@Resolver()
export class AddItemsToCartResolver {
  @Mutation(() => MutationResponse)
  async addItemsToCart(
    @Arg('input', () => AddItemsToCartInput) input: AddItemsToCartInput,
    @Ctx() ctx: GraphQLContext,
  ): Promise<MutationResponse> {
    return await sendCommand(ctx.messageBus, {
      type: 'AddItemsToCart',
      kind: 'Command',
      data: { ...input },
    });
  }
}
"
`);
  });
});
