import {describe, it, expect} from 'vitest';
import {generateScaffoldFilePlans} from './scaffoldFromSchema';
import {SpecsSchema} from "@auto-engineer/flowlang";

describe('generateScaffoldFilePlans', () => {
    it('should generate correct command file', async () => {
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
                                description: 'test',
                                specs: [],
                            },
                            server: {
                                description: 'test',
                                gwt: [{
                                    when: {
                                        commandRef: 'CreateListing',
                                        exampleData: {
                                            propertyId: 'listing_123',
                                            title: 'nice apartment',
                                            pricePerNight: 250,
                                            maxGuests: 4,
                                            amenities: ['wifi', 'kitchen', 'parking'],
                                            available: true,
                                            tags: ['sea view', 'balcony'],
                                            rating: 4.8,
                                            metadata: {petsAllowed: true},
                                            listedAt: '2024-01-15T10:00:00Z',
                                        },
                                    },
                                    then: [],
                                }],
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
                        {name: 'propertyId', type: 'string', required: true},
                        {name: 'title', type: 'string', required: true},
                        {name: 'pricePerNight', type: 'number', required: true},
                        {name: 'maxGuests', type: 'number', required: true},
                        {name: 'amenities', type: 'string[]', required: true},
                        {name: 'available', type: 'boolean', required: true},
                        {name: 'tags', type: 'string[]', required: true},
                        {name: 'rating', type: 'number', required: true},
                        {name: 'metadata', type: 'object', required: true},
                        {name: 'listedAt', type: 'Date', required: true},
                    ],
                },
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const commandFile = plans.find((p) => p.outputPath.endsWith('commands.ts'));

        expect(commandFile?.contents).toMatchInlineSnapshot(`
      "export type CreateListing = Command<
        'CreateListing',
        {
          propertyId: string;
          title: string;
          pricePerNight: number;
          maxGuests: number;
          amenities: string[];
          available: boolean;
          tags: string[];
          rating: number;
          metadata: object;
          listedAt: Date;
        }
      >;
      "
    `);
    });

    it('should generate correct event file', async () => {
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
                                description: 'test',
                                specs: [],
                            },
                            server: {
                                description: 'test',
                                gwt: [{
                                    when: {
                                        commandRef: 'CreateListing',
                                        exampleData: {
                                            propertyId: 'listing_123',
                                            title: 'blah',
                                            pricePerNight: 250,
                                            maxGuests: 4,
                                            amenities: ['wifi', 'kitchen'],
                                            available: true,
                                            tags: ['some tag'],
                                            rating: 4.8,
                                            metadata: {foo: 'bar'},
                                            listedAt: '2024-01-15T10:00:00Z',
                                        },
                                    },
                                    then: [
                                        {
                                            eventRef: 'ListingCreated',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {foo: 'bar'},
                                            },
                                        },
                                    ],
                                }],
                            },
                        },
                    ],
                },
            ],
            messages: [
                {
                    type: 'command',
                    name: 'CreateListing',
                    fields: [],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [
                        {name: 'propertyId', type: 'string', required: true},
                        {name: 'listedAt', type: 'Date', required: true},
                        {name: 'rating', type: 'number', required: true},
                        {name: 'metadata', type: 'object', required: true},
                    ],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [
                        {name: 'propertyId', type: 'string', required: true},
                        {name: 'listedAt', type: 'Date', required: true},
                        {name: 'rating', type: 'number', required: true},
                        {name: 'metadata', type: 'object', required: true},
                    ],
                }
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const eventFile = plans.find((p) => p.outputPath.endsWith('events.ts'));

        expect(eventFile?.contents).toMatchInlineSnapshot(`
"import type { Event } from '@event-driven-io/emmett';

export type ListingCreated = Event<
  'ListingCreated',
  {
    propertyId: string;
    listedAt: Date;
    rating: number;
    metadata: object;
  }
>;
"
    `);
    });

    it('should generate an initial state', async () => {
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
                                description: 'test',
                                specs: [],
                            },
                            server: {
                                description: 'test',
                                gwt: [{
                                    when: {
                                        commandRef: 'CreateListing',
                                        exampleData: {
                                            propertyId: 'listing_123',
                                            title: 'nice apartment',
                                            pricePerNight: 250,
                                            available: true,
                                            rating: 4.8,
                                            metadata: {foo: 'bar'},
                                        },
                                    },
                                    then: [
                                        {
                                            eventRef: 'ListingCreated',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {foo: 'bar'},
                                            },
                                        },
                                    ],
                                }]
                                ,
                            },
                        },
                    ],
                },
            ],
            messages: [
                {
                    type: 'command',
                    name: 'CreateListing',
                    fields: [],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [
                        {name: 'propertyId', type: 'string', required: true},
                        {name: 'listedAt', type: 'Date', required: true},
                        {name: 'rating', type: 'number', required: true},
                        {name: 'metadata', type: 'object', required: true},
                    ],
                },
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const stateFile = plans.find((p) => p.outputPath.endsWith('state.ts'));

        expect(stateFile?.contents).toMatchInlineSnapshot(`
          "/**
           * ## IMPLEMENTATION INSTRUCTIONS ##
           *
           * Define the shape of your domain state below. This state should only include
           * values that are used to make decisions in command handlers (decide.ts).
           *
           * You should:
           * - Add only fields that are **read** during command validation
           * - Avoid adding fields that are only useful for projections or queries
           * - Prefer primitive types (string, number, boolean, etc.) unless structure is required
           * - Use optional fields if values are derived incrementally from multiple events
           *
           * Do NOT include:
           * - Redundant data already stored in events unless needed for logic
           * - Any state that is not referenced in business rules
           */

          export type State = {
            // TODO: Define the shape of your domain state
          };

          /**
           * ## IMPLEMENTATION INSTRUCTIONS ##
           *
           * Provide a safe initial state value. This is the starting state before any events
           * are applied. Initialize with default or empty values as appropriate.
           */
          export const initialState: State = {
            // TODO: Provide the initial state values
          };
          "
        `);
    });

    it('should generate a valid decide file when both command and event exist', async () => {
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
                                description: 'test',
                                specs: [],
                            },
                            server: {
                                description: 'test',
                                gwt: [{
                                    when: {
                                        commandRef: 'CreateListing',
                                        exampleData: {
                                            propertyId: 'listing_123',
                                            title: 'Modern Downtown Apartment',
                                            listedAt: '2024-01-15T10:00:00Z',
                                            rating: 4.8,
                                            metadata: {foo: 'bar'},
                                        },
                                    },
                                    then: [
                                        {
                                            eventRef: 'ListingCreated',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {foo: 'bar'},
                                            },
                                        },
                                    ],
                                }],
                            },
                        },
                    ],
                },
            ],
            messages: [
                {
                    type: 'command',
                    name: 'CreateListing',
                    fields: [],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [],
                },
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const decideFile = plans.find((p) => p.outputPath.endsWith('decide.ts'));

        expect(decideFile?.contents).toMatchInlineSnapshot(`
          "import { IllegalStateError } from '@event-driven-io/emmett';
          import type { State } from './state';
          import type { CreateListing } from './commands';
          import type { ListingCreated } from './events';

          export const decide = (command: CreateListing, state: State): ListingCreated => {
            switch (command.type) {
              case 'CreateListing': {
                return {
                  type: 'ListingCreated',
                  data: { ...command.data },
                };
              }
              default:
                throw new IllegalStateError('Unexpected command type: ' + command.type);
            }
          };
          "
        `);
    });

    it('should include implementation instructions when prior events are required', async () => {
        const spec: SpecsSchema = {
            variant: 'specs',
            flows: [
                {
                    name: 'Host removes a listing',
                    slices: [
                        {
                            type: 'command',
                            name: 'Remove listing',
                            client: {
                                description: 'test',
                                specs: [],
                            },
                            server: {
                                description: 'test',
                                gwt: [
                                    {
                                        given: [
                                            {
                                                eventRef: 'ListingCreated',
                                                exampleData: {
                                                    propertyId: 'listing_123',
                                                    listedAt: '2024-01-15T10:00:00Z',
                                                },
                                            },
                                        ],
                                        when: {
                                            commandRef: 'RemoveListing',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                            },
                                        },
                                        then: [
                                            {
                                                eventRef: 'ListingRemoved',
                                                exampleData: {
                                                    propertyId: 'listing_123',
                                                    removedAt: '2024-01-16T12:00:00Z',
                                                },
                                            },
                                        ],
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
                    name: 'RemoveListing',
                    fields: [{name: 'propertyId', type: 'string', required: true}],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [
                        {name: 'propertyId', type: 'string', required: true},
                        {name: 'listedAt', type: 'Date', required: true},
                    ],
                },
                {
                    type: 'event',
                    name: 'ListingRemoved',
                    source: 'internal',
                    fields: [
                        {name: 'propertyId', type: 'string', required: true},
                        {name: 'removedAt', type: 'Date', required: true},
                    ],
                },
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const decideFile = plans.find((p) => p.outputPath.endsWith('decide.ts'));

        expect(decideFile?.contents).toMatchInlineSnapshot(`
          "import { IllegalStateError } from '@event-driven-io/emmett';
          import type { State } from './state';
          import type { RemoveListing } from './commands';
          import type { ListingRemoved } from './events';

          export const decide = (command: RemoveListing, state: State): ListingRemoved => {
            switch (command.type) {
              case 'RemoveListing': {
                /**
                 * ## IMPLEMENTATION INSTRUCTIONS ##
                 *
                 * This command requires evaluating prior state to determine if it can proceed.
                 * You should:
                 * - Inspect the current state (built from past events)
                 * - Decide whether the command is allowed based on that state
                 * - Throw an error if the command is invalid in the current state
                 * - Otherwise return one or more events
                 */
                return {
                  type: 'ListingRemoved',
                  data: { ...command.data },
                };
              }
              default:
                throw new IllegalStateError('Unexpected command type: ' + command.type);
            }
          };
          "
        `);
    });


    it('should generate a decide file that handles multiple GWTs including an error', async () => {
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
                                description: 'test',
                                specs: [],
                            },
                            server: {
                                description: 'test',
                                gwt: [
                                    {
                                        when: {
                                            commandRef: 'CreateListing',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                title: 'Modern Downtown Apartment',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {foo: 'bar'},
                                            },
                                        },
                                        then: [
                                            {
                                                eventRef: 'ListingCreated',
                                                exampleData: {
                                                    propertyId: 'listing_123',
                                                    listedAt: '2024-01-15T10:00:00Z',
                                                    rating: 4.8,
                                                    metadata: {foo: 'bar'},
                                                },
                                            },
                                        ],
                                    },
                                    {
                                        when: {
                                            commandRef: 'CreateListing',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                title: '',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {},
                                            },
                                        },
                                        then: [
                                            {
                                                errorType: 'ValidationError',
                                                message: 'Title must not be empty',
                                            },
                                        ],
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
                        {name: 'propertyId', type: 'string', required: true},
                        {name: 'title', type: 'string', required: true},
                        {name: 'listedAt', type: 'Date', required: true},
                        {name: 'rating', type: 'number', required: true},
                        {name: 'metadata', type: 'object', required: true},
                    ],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [
                        {name: 'propertyId', type: 'string', required: true},
                        {name: 'listedAt', type: 'Date', required: true},
                        {name: 'rating', type: 'number', required: true},
                        {name: 'metadata', type: 'object', required: true},
                    ],
                },
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const decideFile = plans.find((p) => p.outputPath.endsWith('decide.ts'));

        expect(decideFile?.contents).toMatchInlineSnapshot(`
          "import { IllegalStateError, ValidationError } from '@event-driven-io/emmett';
          import type { State } from './state';
          import type { CreateListing } from './commands';
          import type { ListingCreated } from './events';

          export const decide = (command: CreateListing, state: State): ListingCreated => {
            switch (command.type) {
              case 'CreateListing': {
                if (command.data.title === '') {
                  throw new ValidationError('Title must not be empty');
                }
                return {
                  type: 'ListingCreated',
                  data: { ...command.data },
                };
              }
              default:
                throw new IllegalStateError('Unexpected command type: ' + command.type);
            }
          };
          "
        `);
    });


    it('should generate a valid evolve file from event structure', async () => {
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
                                description: 'test',
                                specs: [],
                            },
                            server: {
                                description: 'test',
                                gwt: [{
                                    when: {
                                        commandRef: 'CreateListing',
                                        exampleData: {
                                            propertyId: 'listing_123',
                                            title: 'Some Apartment',
                                            listedAt: '2024-01-15T10:00:00Z',
                                            rating: 4.8,
                                            metadata: {foo: 'bar'},
                                        },
                                    },
                                    then: [
                                        {
                                            eventRef: 'ListingCreated',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {foo: 'bar'},
                                            },
                                        },
                                    ],
                                }],
                            },
                        },
                    ],
                },
            ],
            messages: [
                {
                    type: 'command',
                    name: 'CreateListing',
                    fields: [],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [],
                },
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const evolveFile = plans.find((p) => p.outputPath.endsWith('evolve.ts'));

        expect(evolveFile?.contents).toMatchInlineSnapshot(`
          "import type { State } from './state';
          import type { ListingCreated } from './events';

          /**
           * ## IMPLEMENTATION INSTRUCTIONS ##
           *
           * Define how each event updates the domain state.
           * - Only update the parts of state necessary for command decision logic.
           * - Ignore fields in \`event.data\` that are not required in \`decide\`.
           * - If the event does not affect state, return state as-is.
           * - Avoid merging all of \`event.data\` unless intentional.
           */

          export const evolve = (state: State, event: ListingCreated): State => {
            switch (event.type) {
              case 'ListingCreated': {
                // TODO: Update state based on ListingCreated
                return {
                  ...state,
                };
              }
              default:
                return state;
            }
          };
          "
        `);
    });
});