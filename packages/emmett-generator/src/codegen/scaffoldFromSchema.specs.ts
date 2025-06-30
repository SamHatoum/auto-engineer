import {describe, it, expect} from 'vitest';
import {Flow} from './types';
import {generateScaffoldFilePlans} from './scaffoldFromSchema';


describe('generateScaffoldFilePlans', () => {
    it('should generate correct command file with inferred types', async () => {

        const flow: Flow[] = [
            {
                name: 'Host creates a listing',
                slices: [
                    {
                        type: 'command',
                        name: 'Create listing',
                        server: {
                            specs: [
                                {
                                    when: {
                                        type: 'CreateListing',
                                        data: {
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
                                },
                            ],
                        },
                    },
                ],
            },
        ];

        const plans = await generateScaffoldFilePlans(flow, 'src/domain/flows');
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

    it('should generate correct event file with inferred types', async () => {
        const flow: Flow[] = [
            {
                name: 'Host creates a listing',
                slices: [
                    {
                        type: 'command',
                        name: 'Create listing',
                        server: {
                            specs: [
                                {
                                    when: {
                                        type: 'CreateListing',
                                        data: {
                                            propertyId: 'listing_123',
                                            title: 'blah',
                                            pricePerNight: 250,
                                            maxGuests: 4,
                                            amenities: ['wifi', 'kitchen'],
                                            available: true,
                                            tags: ['some tag'],
                                            rating: 4.8,
                                            metadata: {foo: 'bar'},
                                            listedAt: '2024-01-15T10:00:00Z'
                                        }
                                    },
                                    then: [
                                        {
                                            type: 'ListingCreated',
                                            data: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {foo: 'bar'}
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        type: 'command',
                        name: 'Listing created',
                        server: {
                            specs: [
                                {
                                    when: {
                                        type: 'IgnoredCommand',
                                        data: {}
                                    },
                                    then: [
                                        {
                                            type: 'ListingCreated',
                                            data: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {foo: 'bar'}
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }
        ];

        const plans = await generateScaffoldFilePlans(flow, 'src/domain/flows');
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
    it('should generate an initial state file with AI refinement comment', async () => {
        const flows: Flow[] = [
            {
                name: 'Host creates a listing',
                slices: [
                    {
                        type: 'command',
                        name: 'Create listing',
                        server: {
                            specs: [
                                {
                                    when: {
                                        type: 'CreateListing',
                                        data: {
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
                                            type: 'ListingCreated',
                                            data: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: {foo: 'bar'},
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
        ];

        const plans = await generateScaffoldFilePlans(flows, 'src/domain/flows');
        const stateFile = plans.find((p) => p.outputPath.endsWith('state.ts'));
        expect(stateFile?.contents).toMatchInlineSnapshot(`
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

    it('should generate a valid decide file when both command and event exist', async () => {
        const flows: Flow[] = [
            {
                name: 'Host creates a listing',
                slices: [
                    {
                        type: 'command',
                        name: 'Create listing',
                        server: {
                            specs: [
                                {
                                    when: {
                                        type: 'CreateListing',
                                        data: {
                                            propertyId: 'listing_123',
                                            title: 'Modern Downtown Apartment',
                                            listedAt: '2024-01-15T10:00:00Z',
                                            rating: 4.8,
                                            metadata: { foo: 'bar' },
                                        },
                                    },
                                    then: [
                                        {
                                            type: 'ListingCreated',
                                            data: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: { foo: 'bar' },
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
        ];

        const plans = await generateScaffoldFilePlans(flows, 'src/domain/flows');
        const decideFile = plans.find((p) => p.outputPath.endsWith('decide.ts'));

        expect(decideFile?.contents).toMatchInlineSnapshot(`
          "import { IllegalStateError } from '@event-driven-io/emmett';
          import type { State } from './state';
          import type { CreateListing } from './commands';
          import type { ListingCreated } from './events';

          export const decide = (command: CreateListing, state: State): ListingCreated => {
            if (command.type !== 'CreateListing') {
              throw new IllegalStateError(\`Unexpected command type: \${command.type}\`);
            }

            // TODO: Add domain rules to validate command against state before emitting event

            return {
              type: 'ListingCreated',
              data: {
                ...command.data,
              },
            };
          };
          "
        `);
    });
    
    it('should generate a valid evolve file from event structure', async () => {
        const flows: Flow[] = [
            {
                name: 'Host creates a listing',
                slices: [
                    {
                        type: 'command',
                        name: 'Create listing',
                        server: {
                            specs: [
                                {
                                    when: {
                                        type: 'CreateListing',
                                        data: {
                                            propertyId: 'listing_123',
                                            title: 'Some Apartment',
                                            listedAt: '2024-01-15T10:00:00Z',
                                            rating: 4.8,
                                            metadata: { foo: 'bar' },
                                        },
                                    },
                                    then: [
                                        {
                                            type: 'ListingCreated',
                                            data: {
                                                propertyId: 'listing_123',
                                                listedAt: '2024-01-15T10:00:00Z',
                                                rating: 4.8,
                                                metadata: { foo: 'bar' },
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
        ];

        const plans = await generateScaffoldFilePlans(flows, 'src/domain/flows');
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