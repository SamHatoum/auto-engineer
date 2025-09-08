import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flow';

describe('projection.ts.ejs', () => {
  it('should generate a valid projection file with correct relative event import path from producing slice', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'listing-flow',
          slices: [
            {
              type: 'command',
              name: 'create-listing',
              stream: 'listing-${propertyId}',
              client: {
                description: 'create listing UI',
              },
              server: {
                description: 'handles create/remove listing',
                specs: {
                  name: 'Create/remove listing command',
                  rules: [
                    {
                      description: 'Should handle listing operations',
                      examples: [
                        {
                          description: 'User creates listing successfully',
                          when: {
                            commandRef: 'CreateListing',
                            exampleData: {
                              propertyId: 'listing_123',
                              title: 'Sea View Flat',
                              pricePerNight: 120,
                              location: 'Brighton',
                              maxGuests: 4,
                            },
                          },
                          then: [
                            {
                              eventRef: 'ListingCreated',
                              exampleData: {
                                propertyId: 'listing_123',
                                title: 'Sea View Flat',
                                pricePerNight: 120,
                                location: 'Brighton',
                                maxGuests: 4,
                              },
                            },
                          ],
                        },
                        {
                          description: 'User removes listing successfully',
                          when: {
                            commandRef: 'RemoveListing',
                            exampleData: {
                              propertyId: 'listing_123',
                            },
                          },
                          then: [
                            {
                              eventRef: 'ListingRemoved',
                              exampleData: {},
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              type: 'query',
              name: 'search-listings',
              stream: 'listings',
              client: {
                description: 'search listings UI',
              },
              server: {
                description: 'projection for available listings',
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'AvailableListings',
                    },
                    origin: {
                      type: 'projection',
                      name: 'AvailablePropertiesProjection',
                      idField: 'propertyId',
                    },
                  },
                ],
                specs: {
                  name: 'Search listings query',
                  rules: [
                    {
                      description: 'Should project listings correctly',
                      examples: [
                        {
                          description: 'Listing created shows in search results',
                          when: [
                            {
                              eventRef: 'ListingCreated',
                              exampleData: {
                                propertyId: 'listing_123',
                                title: 'Sea View Flat',
                                pricePerNight: 120,
                                location: 'Brighton',
                                maxGuests: 4,
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'AvailableListings',
                              exampleData: {
                                propertyId: 'listing_123',
                                title: 'Sea View Flat',
                                pricePerNight: 120,
                                location: 'Brighton',
                                maxGuests: 4,
                              },
                            },
                          ],
                        },
                        {
                          description: 'Listing removed disappears from search results',
                          when: [
                            {
                              eventRef: 'ListingRemoved',
                              exampleData: {
                                propertyId: 'listing_123',
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'AvailableListings',
                              exampleData: {},
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
          name: 'CreateListing',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'pricePerNight', type: 'number', required: true },
            { name: 'location', type: 'string', required: true },
            { name: 'maxGuests', type: 'number', required: true },
          ],
        },
        {
          type: 'command',
          name: 'RemoveListing',
          fields: [{ name: 'propertyId', type: 'string', required: true }],
        },
        {
          type: 'event',
          name: 'ListingCreated',
          source: 'internal',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'pricePerNight', type: 'number', required: true },
            { name: 'location', type: 'string', required: true },
            { name: 'maxGuests', type: 'number', required: true },
          ],
        },
        {
          type: 'event',
          name: 'ListingRemoved',
          source: 'internal',
          fields: [{ name: 'propertyId', type: 'string', required: true }],
        },
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
    const projectionFile = plans.find((p) => p.outputPath.endsWith('projection.ts'));

    expect(projectionFile?.contents).toMatchInlineSnapshot(`
      "import {
        inMemorySingleStreamProjection,
        type ReadEvent,
        type InMemoryReadEventMetadata,
      } from '@event-driven-io/emmett';
      import type { AvailableListings } from './state';
      import type { ListingCreated, ListingRemoved } from '../create-listing/events';

      type AllEvents = ListingCreated | ListingRemoved;

      export const projection = inMemorySingleStreamProjection<AvailableListings, AllEvents>({
        collectionName: 'AvailablePropertiesProjection',
        canHandle: ['ListingCreated', 'ListingRemoved'],
        getDocumentId: (event) => event.data.propertyId,
        evolve: (
          document: AvailableListings | null,
          event: ReadEvent<AllEvents, InMemoryReadEventMetadata>,
        ): AvailableListings | null => {
          switch (event.type) {
            case 'ListingCreated': {
              /**
               * ## IMPLEMENTATION INSTRUCTIONS ##
               * This event adds or updates the document.
               * Implement the correct fields as needed for your read model.
               */
              return {
                propertyId: /* TODO: map from event.data */ '',
                title: /* TODO: map from event.data */ '',
                pricePerNight: /* TODO: map from event.data */ 0,
                location: /* TODO: map from event.data */ '',
                maxGuests: /* TODO: map from event.data */ 0,
              };
            }

            case 'ListingRemoved': {
              /**
               * ## IMPLEMENTATION INSTRUCTIONS ##
               * This event might indicate removal of a AvailableListings.
               *
               * - If the intent is to **remove the document**, return \`null\`.
               * - If the intent is to **soft delete**, consider adding a \`status\` field (e.g., \`status: 'removed'\`).
               * - Ensure consumers of this projection (e.g., UI) handle the chosen approach appropriately.
               */
              return null;
            }
            default:
              return document;
          }
        },
      });

      export default projection;
      "
    `);
  });
  it('should generate a valid query resolver using ID type', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'wishlist-flow',
          slices: [
            {
              type: 'query',
              name: 'view-wishlist',
              request: `
              query GetWishlist($sessionId: ID!) {
                wishlist(sessionId: $sessionId) {
                  sessionId
                  items
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
                      idField: 'sessionId',
                      name: 'WishlistProjection',
                    },
                    target: {
                      type: 'State',
                      name: 'Wishlist',
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
          name: 'Wishlist',
          fields: [
            { name: 'sessionId', type: 'string', required: true },
            { name: 'items', type: 'string', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const resolverFile = plans.find((p) => p.outputPath.endsWith('query.resolver.ts'));

    expect(resolverFile?.contents).toMatchInlineSnapshot(`
      "import { Query, Resolver, Arg, Ctx, ObjectType, Field, ID } from 'type-graphql';
      import { type GraphQLContext, ReadModel } from '../../../shared';

      @ObjectType()
      export class Wishlist {
        @Field(() => String)
        sessionId!: string;

        @Field(() => String)
        items!: string;

        [key: string]: unknown;
      }

      @Resolver()
      export class ViewWishlistQueryResolver {
        @Query(() => [Wishlist])
        async wishlist(
          @Ctx() ctx: GraphQLContext,
          @Arg('sessionId', () => ID, { nullable: true }) sessionId?: string,
        ): Promise<Wishlist[]> {
          const model = new ReadModel<Wishlist>(ctx.eventStore, 'WishlistProjection');

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
            if (sessionId !== undefined && item.sessionId !== sessionId) return false;

            return true;
          });
        }
      }
      "
    `);
  });
});
