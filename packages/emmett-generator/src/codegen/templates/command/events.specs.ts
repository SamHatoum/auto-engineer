import {describe, it, expect} from 'vitest';
import {SpecsSchema} from "@auto-engineer/flowlang";
import {generateScaffoldFilePlans} from "../../scaffoldFromSchema";

describe('events.ts.ejs', () => {

    it('should generate an event file', async () => {
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

});