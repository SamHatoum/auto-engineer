import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from './scaffoldFromSchema';
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
                                gwt: {
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
                                            metadata: { petsAllowed: true },
                                            listedAt: '2024-01-15T10:00:00Z',
                                        },
                                    },
                                    then: [],
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
                                gwt: {
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
                                            metadata: { foo: 'bar' },
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
                                                metadata: { foo: 'bar' },
                                            },
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
                    fields: [],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [
                        { name: 'propertyId', type: 'string', required: true },
                        { name: 'listedAt', type: 'Date', required: true },
                        { name: 'rating', type: 'number', required: true },
                        { name: 'metadata', type: 'object', required: true },
                    ],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [
                        { name: 'propertyId', type: 'string', required: true },
                        { name: 'listedAt', type: 'Date', required: true },
                        { name: 'rating', type: 'number', required: true },
                        { name: 'metadata', type: 'object', required: true },
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
                                gwt: {
                                    when: {
                                        commandRef: 'CreateListing',
                                        exampleData: {
                                            propertyId: 'listing_123',
                                            title: 'nice apartment',
                                            pricePerNight: 250,
                                            available: true,
                                            rating: 4.8,
                                            metadata: { foo: 'bar' },
                                        },
                                    },
                                    then: [
                                        {
                                            eventRef: 'ListingCreated',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: { foo: 'bar' },
                                            },
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
                    fields: [],
                },
                {
                    type: 'event',
                    name: 'ListingCreated',
                    source: 'internal',
                    fields: [
                        { name: 'propertyId', type: 'string', required: true },
                        { name: 'listedAt', type: 'Date', required: true },
                        { name: 'rating', type: 'number', required: true },
                        { name: 'metadata', type: 'object', required: true },
                    ],
                },
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const stateFile = plans.find((p) => p.outputPath.endsWith('state.ts'));

        expect(stateFile?.contents).toMatchInlineSnapshot(`
"export type State = {
  // TODO: Define the shape of your domain state
};

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
                                gwt: {
                                    when: {
                                        commandRef: 'CreateListing',
                                        exampleData: {
                                            propertyId: 'listing_123',
                                            title: 'Modern Downtown Apartment',
                                            listedAt: '2024-01-15T10:00:00Z',
                                            rating: 4.8,
                                            metadata: { foo: 'bar' },
                                        },
                                    },
                                    then: [
                                        {
                                            eventRef: 'ListingCreated',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: { foo: 'bar' },
                                            },
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
                                gwt: {
                                    when: {
                                        commandRef: 'CreateListing',
                                        exampleData: {
                                            propertyId: 'listing_123',
                                            title: 'Some Apartment',
                                            listedAt: '2024-01-15T10:00:00Z',
                                            rating: 4.8,
                                            metadata: { foo: 'bar' },
                                        },
                                    },
                                    then: [
                                        {
                                            eventRef: 'ListingCreated',
                                            exampleData: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: { foo: 'bar' },
                                            },
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

export const evolve = (state: State, event: ListingCreated): State => {
  switch (event.type) {
    case 'ListingCreated':
      return {
        ...state,
        ...event.data,
      };
    default:
      return state;
  }
};
"
    `);
    });
});