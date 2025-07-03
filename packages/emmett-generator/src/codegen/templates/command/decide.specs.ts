import {describe, it, expect} from 'vitest';
import {SpecsSchema} from "@auto-engineer/flowlang";
import {generateScaffoldFilePlans} from "../../scaffoldFromSchema";

describe('decide.ts.ejs', () => {

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
                                            title: 'Some apartment',
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
                /**
                 * ## IMPLEMENTATION INSTRUCTIONS ##
                 *
                 * This command can directly emit one or more events based on the input.
                 *
                 * You should:
                 * - Validate the command input fields
                 * - Inspect the current domain \`state\` to determine if the command is allowed
                 * - If invalid, throw one of the following domain errors \`NotFoundError\`, \`ValidationError\` or \`IllegalStateError\`
                 * - If valid, return one or more events with the correct structure
                 *
                 * ⚠️ Only read from \`state\` — never mutate it. The \`evolve.ts\` file is responsible for updating state.
                 */

                // return {
                //   type: 'ListingCreated',
                //   data: { ...command.data },
                // } as ListingCreated;

                throw new IllegalStateError('Not yet implemented: ' + command.type);
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
                 *
                 * You should:
                 * - Validate the command input fields
                 * - Inspect the current domain \`state\` to determine if the command is allowed
                 * - If invalid, throw one of the following domain errors \`NotFoundError\`, \`ValidationError\` or \`IllegalStateError\`
                 * - If valid, return one or more events with the correct structure
                 *
                 * ⚠️ Only read from \`state\` — never mutate it. The \`evolve.ts\` file is responsible for updating state.
                 */

                // return {
                //   type: 'ListingRemoved',
                //   data: { ...command.data },
                // } as ListingRemoved;

                throw new IllegalStateError('Not yet implemented: ' + command.type);
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
                /**
                 * ## IMPLEMENTATION INSTRUCTIONS ##
                 *
                 * This command can directly emit one or more events based on the input.
                 *
                 * You should:
                 * - Validate the command input fields
                 * - Inspect the current domain \`state\` to determine if the command is allowed
                 * - If invalid, throw one of the following domain errors \`NotFoundError\`, \`ValidationError\` or \`IllegalStateError\`
                 * - If valid, return one or more events with the correct structure
                 *
                 * ⚠️ Only read from \`state\` — never mutate it. The \`evolve.ts\` file is responsible for updating state.
                 */
                if (command.data.title === '') {
                  throw new ValidationError('Title must not be empty');
                }

                // return {
                //   type: 'ListingCreated',
                //   data: { ...command.data },
                // } as ListingCreated;

                throw new IllegalStateError('Not yet implemented: ' + command.type);
              }
              default:
                throw new IllegalStateError('Unexpected command type: ' + command.type);
            }
          };
          "
        `);
    });
});