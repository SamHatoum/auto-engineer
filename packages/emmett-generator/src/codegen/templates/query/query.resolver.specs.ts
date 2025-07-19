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
      import { type GraphQLContext, ReadModel } from '../../../shared';

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
          // You can query the projection using the ReadModel API:
          //
          // - model.getAll() — fetch all documents
          // - model.getById(id) — fetch a single document by ID (default key: 'id')
          // - model.find(filterFn) — filter documents using a predicate
          // - model.first(filterFn) — fetch the first document matching a predicate
          //
          // Example below uses \`.find()\` to filter
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
});
