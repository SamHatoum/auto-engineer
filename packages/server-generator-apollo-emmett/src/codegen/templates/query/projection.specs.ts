import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { Model } from '@auto-engineer/narrative';

describe('projection.ts.ejs', () => {
  it('should generate a valid projection file with correct relative event import path from producing slice', async () => {
    const flows: Model = {
      variant: 'specs',
      narratives: [
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

    const plans = await generateScaffoldFilePlans(flows.narratives, flows.messages, undefined, 'src/domain/flows');
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
               * Implement how this event updates the projection.
               *
               * **IMPORTANT - Internal State Pattern:**
               * If you need to track state beyond the public AvailableListings type (e.g., to calculate
               * aggregations, track previous values, etc.), follow this pattern:
               *
               * 1. Define an extended interface BEFORE the projection:
               *    interface InternalAvailableListings extends AvailableListings {
               *      internalField: SomeType;
               *    }
               *
               * 2. Cast document parameter to extended type:
               *    const current: InternalAvailableListings = (document as InternalAvailableListings) || { ...defaults };
               *
               * 3. Cast return values to extended type:
               *    return { ...allFields, internalField } as InternalAvailableListings;
               *
               * This keeps internal state separate from the public GraphQL schema.
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
    const spec: Model = {
      variant: 'specs',
      narratives: [
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

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, undefined, 'src/domain/flows');
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

        // IMPORTANT: Index signature required for ReadModel<T extends Record<string, unknown>> compatibility
        [key: string]: unknown;
      }

      @Resolver()
      export class ViewWishlistQueryResolver {
        @Query(() => [Wishlist])
        async wishlist(
          @Ctx() ctx: GraphQLContext,
          @Arg('sessionId', () => ID, { nullable: true }) sessionId?: string,
        ): Promise<Wishlist[]> {
          const model = new ReadModel<Wishlist>(ctx.database, 'WishlistProjection');

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

  it('should generate a valid singleton projection file', async () => {
    const flows: Model = {
      variant: 'specs',
      narratives: [
        {
          name: 'todo-flow',
          slices: [
            {
              type: 'command',
              name: 'manage-todo',
              stream: 'todo-${todoId}',
              client: {
                description: 'manage todo UI',
              },
              server: {
                description: 'handles todo operations',
                specs: {
                  name: 'Manage todo command',
                  rules: [
                    {
                      description: 'Should handle todo operations',
                      examples: [
                        {
                          description: 'User adds todo',
                          when: {
                            commandRef: 'AddTodo',
                            exampleData: {
                              todoId: 'todo_123',
                              title: 'Buy milk',
                            },
                          },
                          then: [
                            {
                              eventRef: 'TodoAdded',
                              exampleData: {
                                todoId: 'todo_123',
                                title: 'Buy milk',
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
            {
              type: 'query',
              name: 'view-summary',
              stream: 'todos',
              client: {
                description: 'view todo summary UI',
              },
              server: {
                description: 'singleton projection for todo summary',
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'TodoSummary',
                    },
                    origin: {
                      type: 'projection',
                      name: 'TodoSummaryProjection',
                      singleton: true,
                    },
                  },
                ],
                specs: {
                  name: 'View summary query',
                  rules: [
                    {
                      description: 'Should aggregate todo counts',
                      examples: [
                        {
                          description: 'Todo added updates count',
                          when: [
                            {
                              eventRef: 'TodoAdded',
                              exampleData: {
                                todoId: 'todo_123',
                                title: 'Buy milk',
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'TodoSummary',
                              exampleData: {
                                totalCount: 1,
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
          name: 'AddTodo',
          fields: [
            { name: 'todoId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
          ],
        },
        {
          type: 'event',
          name: 'TodoAdded',
          source: 'internal',
          fields: [
            { name: 'todoId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
          ],
        },
        {
          type: 'state',
          name: 'TodoSummary',
          fields: [{ name: 'totalCount', type: 'number', required: true }],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(flows.narratives, flows.messages, undefined, 'src/domain/flows');
    const projectionFile = plans.find((p) => p.outputPath.endsWith('view-summary/projection.ts'));

    expect(projectionFile?.contents).toMatchInlineSnapshot(`
      "import {
        inMemorySingleStreamProjection,
        type ReadEvent,
        type InMemoryReadEventMetadata,
      } from '@event-driven-io/emmett';
      import type { TodoSummary } from './state';
      import type { TodoAdded } from '../manage-todo/events';

      // SINGLETON AGGREGATION PATTERN
      // This projection maintains a single document that aggregates data from multiple entities.
      // Use internal state to track individual entity information for accurate calculations.
      interface InternalTodoSummary extends TodoSummary {
        _entities?: Record<string, { status?: string; [key: string]: unknown }>;
      }

      type AllEvents = TodoAdded;

      export const projection = inMemorySingleStreamProjection<TodoSummary, AllEvents>({
        collectionName: 'TodoSummaryProjection',
        canHandle: ['TodoAdded'],
        getDocumentId: (_event) => 'todo-summary',
        evolve: (
          document: TodoSummary | null,
          event: ReadEvent<AllEvents, InMemoryReadEventMetadata>,
        ): TodoSummary | null => {
          switch (event.type) {
            case 'TodoAdded': {
              /**
               * ## IMPLEMENTATION INSTRUCTIONS ##
               * **SINGLETON AGGREGATION PATTERN**
               *
               * This projection maintains ONE document aggregating data from MANY entities.
               *
               * CRITICAL: Use internal state to track individual entity information:
               *
               * 1. Access current state:
               *    const current = (document as InternalTodoSummary) || { ...initialState, _entities: {} };
               *
               * 2. Track entity changes:
               *    const entityId = event.data.todoId; // or relevant ID field
               *    const prevStatus = current._entities?.[entityId]?.status;
               *    current._entities[entityId] = { status: 'new_status', ...otherData };
               *
               * 3. Calculate aggregates from entity states:
               *    const counts = Object.values(current._entities).reduce((acc, entity) => {
               *      acc[entity.status] = (acc[entity.status] || 0) + 1;
               *      return acc;
               *    }, {});
               *
               * 4. Return with internal state:
               *    return { ...publicFields, _entities: current._entities } as InternalTodoSummary;
               */
              return {
                totalCount: /* TODO: map from event.data */ 0,
              };
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

  it('should generate a valid composite key projection file', async () => {
    const flows: Model = {
      variant: 'specs',
      narratives: [
        {
          name: 'user-project-flow',
          slices: [
            {
              type: 'command',
              name: 'manage-user-project',
              stream: 'user-project-${userId}-${projectId}',
              client: {
                description: 'manage user project UI',
              },
              server: {
                description: 'handles user project operations',
                specs: {
                  name: 'Manage user project command',
                  rules: [
                    {
                      description: 'Should handle user project operations',
                      examples: [
                        {
                          description: 'User joins project',
                          when: {
                            commandRef: 'JoinProject',
                            exampleData: {
                              userId: 'user_123',
                              projectId: 'proj_456',
                              role: 'developer',
                            },
                          },
                          then: [
                            {
                              eventRef: 'UserJoinedProject',
                              exampleData: {
                                userId: 'user_123',
                                projectId: 'proj_456',
                                role: 'developer',
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
            {
              type: 'query',
              name: 'view-user-projects',
              stream: 'user-projects',
              client: {
                description: 'view user projects UI',
              },
              server: {
                description: 'composite key projection for user projects',
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'UserProject',
                    },
                    origin: {
                      type: 'projection',
                      name: 'UserProjectsProjection',
                      idField: ['userId', 'projectId'],
                    },
                  },
                ],
                specs: {
                  name: 'View user projects query',
                  rules: [
                    {
                      description: 'Should track user project memberships',
                      examples: [
                        {
                          description: 'User joins project',
                          when: [
                            {
                              eventRef: 'UserJoinedProject',
                              exampleData: {
                                userId: 'user_123',
                                projectId: 'proj_456',
                                role: 'developer',
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'UserProject',
                              exampleData: {
                                userId: 'user_123',
                                projectId: 'proj_456',
                                role: 'developer',
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
          name: 'JoinProject',
          fields: [
            { name: 'userId', type: 'string', required: true },
            { name: 'projectId', type: 'string', required: true },
            { name: 'role', type: 'string', required: true },
          ],
        },
        {
          type: 'event',
          name: 'UserJoinedProject',
          source: 'internal',
          fields: [
            { name: 'userId', type: 'string', required: true },
            { name: 'projectId', type: 'string', required: true },
            { name: 'role', type: 'string', required: true },
          ],
        },
        {
          type: 'state',
          name: 'UserProject',
          fields: [
            { name: 'userId', type: 'string', required: true },
            { name: 'projectId', type: 'string', required: true },
            { name: 'role', type: 'string', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(flows.narratives, flows.messages, undefined, 'src/domain/flows');
    const projectionFile = plans.find((p) => p.outputPath.endsWith('view-user-projects/projection.ts'));

    expect(projectionFile?.contents).toMatchInlineSnapshot(`
      "import {
        inMemorySingleStreamProjection,
        type ReadEvent,
        type InMemoryReadEventMetadata,
      } from '@event-driven-io/emmett';
      import type { UserProject } from './state';
      import type { UserJoinedProject } from '../manage-user-project/events';

      type AllEvents = UserJoinedProject;

      export const projection = inMemorySingleStreamProjection<UserProject, AllEvents>({
        collectionName: 'UserProjectsProjection',
        canHandle: ['UserJoinedProject'],
        getDocumentId: (event) => \`\${event.data.userId}-\${event.data.projectId}\`,
        evolve: (
          document: UserProject | null,
          event: ReadEvent<AllEvents, InMemoryReadEventMetadata>,
        ): UserProject | null => {
          switch (event.type) {
            case 'UserJoinedProject': {
              /**
               * ## IMPLEMENTATION INSTRUCTIONS ##
               * **COMPOSITE KEY PROJECTION**
               *
               * This projection uses a composite key: userId + projectId
               * Document ID format: \`\${event.data.userId}-\${event.data.projectId}\`
               *
               * CRITICAL: You MUST include ALL key fields in every return statement:
               * - userId: event.data.userId
               * - projectId: event.data.projectId
               *
               * Missing even one key field will cause the projection to fail.
               * Key fields typically map directly from event data (no transformation needed).
               *
               * Example implementation:
               *    return {
               *      userId: event.data.userId,
               *      projectId: event.data.projectId,
               *      // ... other fields
               *    };
               */
              return {
                userId: /* TODO: map from event.data */ '',
                projectId: /* TODO: map from event.data */ '',
                role: /* TODO: map from event.data */ '',
              };
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
});
