import {describe, it, expect} from 'vitest';
import {generateScaffoldFilePlans} from '../../scaffoldFromSchema';
import {SpecsSchemaType as SpecsSchema} from "@auto-engineer/flowlang";

describe('generateScaffoldFilePlans', () => {
    it('should generate a valid handle file', async () => {
        const spec: SpecsSchema = {
            variant: 'specs',
            flows: [
                {
                    name: 'Host creates a listing',
                    slices: [
                        {
                            type: 'command',
                            name: 'Create listing',
                            stream: 'listing-${propertyId}',
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
                                data: [
                                    {
                                        target: {
                                            type: 'Event',
                                            name: 'ListingCreated',
                                        },
                                        destination: {
                                            type: 'stream',
                                            pattern: 'listings-${propertyId}',
                                        },
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
                        {name: 'title', type: 'string', required: true},
                        {name: 'listedAt', type: 'Date', required: true},
                        {name: 'rating', type: 'number', required: true},
                        {name: 'metadata', type: 'object', required: true},
                    ],
                },
            ],
        };

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const handleFile = plans.find((p) => p.outputPath.endsWith('handle.ts'));

        expect(handleFile?.contents).toMatchInlineSnapshot(`
          "import { CommandHandler, type EventStore } from '@event-driven-io/emmett';
          import { evolve } from './evolve';
          import { initialState } from './state';
          import { decide } from './decide';
          import type { CreateListing } from './commands';
          import type { HandlerResult } from '../../../shared';

          const commandHandler = CommandHandler({
            evolve,
            initialState,
          });

          export const handle = async (eventStore: EventStore, command: CreateListing): Promise<HandlerResult> => {
            const streamId = \`listings-\${command.data.propertyId}\`;
            try {
              await commandHandler(eventStore, streamId, (state) => decide(command, state));
              return { success: true };
            } catch (error: any) {
              return {
                success: false,
                error: {
                  type: error?.name ?? 'UnknownError',
                  message: error?.message ?? 'An unexpected error occurred',
                },
              };
            }
          };
          "
        `);
    });
});