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
          "import { CommandHandler, type EventStore, type MessageHandlerResult } from '@event-driven-io/emmett';
          import { evolve } from './evolve';
          import { initialState } from './state';
          import { decide } from './decide';
          import type { CreateListing } from './commands';

          const handler = CommandHandler({
            evolve,
            initialState,
          });

          export const handle = async (eventStore: EventStore, command: CreateListing): Promise<MessageHandlerResult> => {
            const streamId = \`listings-\${command.data.propertyId}\`;

            try {
              await handler(eventStore, streamId, (state) => decide(command, state));
              return; // success (returns void)
            } catch (error: any) {
              return {
                type: 'SKIP',
                reason: \`Command failed: \${error?.message ?? 'Unknown'}\`,
              };
            }
          };
          "
        `);
    });
});