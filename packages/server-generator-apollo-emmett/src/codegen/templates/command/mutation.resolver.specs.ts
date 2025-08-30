import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flow';

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
                specs: [],
              },
              server: {
                description: 'Handles listing creation',
                gwt: [
                  {
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
      "import { Mutation, Resolver, Arg, Ctx, Field, InputType } from 'type-graphql';
      import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

      @InputType()
      export class CreateListingInput {
        @Field(() => String)
        propertyId!: string;
        @Field(() => String)
        title!: string;
        @Field(() => Number)
        pricePerNight!: number;
        @Field(() => Number)
        maxGuests!: number;
        @Field(() => [String])
        amenities!: string[];
        @Field(() => Boolean)
        available!: boolean;
        @Field(() => [String])
        tags!: string[];
        @Field(() => Number)
        rating!: number;
        @Field(() => Object)
        metadata!: object;
        @Field(() => Date)
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
});
