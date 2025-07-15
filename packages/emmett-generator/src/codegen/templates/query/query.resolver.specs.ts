import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flowlang';

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
                specs: [],
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
                gwt: [],
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

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
    const resolverFile = plans.find((p) => p.outputPath.endsWith('query.resolver.ts'));

    expect(resolverFile?.contents).toMatchInlineSnapshot(`
          "import { Query, Resolver, Arg, Ctx, ObjectType, Field } from 'type-graphql';
          import { GraphQLContext, ReadModel } from '../../shared';

          @ObjectType()
          export class AvailableListings {
            @Field(() => String)
            propertyId!: string;

            @Field(() => String)
            title!: string;

            @Field(() => Number)
            pricePerNight!: number;

            @Field(() => String)
            location!: string;

            @Field(() => Number)
            maxGuests!: number;

            [key: string]: unknown;
          }

          @Resolver()
          export class SearchListingsQueryResolver {
            @Query(() => [AvailableListings])
            async searchProperties(
              @Ctx() ctx: GraphQLContext,
              @Arg('location', () => String, { nullable: true }) location?: string,
              @Arg('maxPrice', () => Number, { nullable: true }) maxPrice?: number,
              @Arg('minGuests', () => Number, { nullable: true }) minGuests?: number,
            ): Promise<AvailableListings[]> {
              const model = new ReadModel<AvailableListings>(ctx.eventStore, 'AvailablePropertiesProjection');

              // ## IMPLEMENTATION INSTRUCTIONS ##
              // Filter the collection using the provided arguments.
              // You can access the projection via model.find and use .find(filterFn).

              return model.find((item) => {
                if (location && !item.location.toLowerCase().includes(location.toLowerCase())) return false;

                if (maxPrice && item.pricePerNight > maxPrice) return false;

                if (minGuests && item.maxGuests < minGuests) return false;

                return true;
              });
            }
          }
          "
        `);
  });
});
