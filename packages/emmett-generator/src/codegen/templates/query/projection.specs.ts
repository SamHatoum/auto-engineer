import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flowlang';

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
                                specs: [],
                            },
                            server: {
                                description: 'handles create/remove listing',
                                gwt: [
                                    {
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
                        },
                        {
                            type: 'query',
                            name: 'search-listings',
                            stream: 'listings',
                            client: {
                                description: 'search listings UI',
                                specs: [],
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
                                gwt: [
                                    {
                                        given: [
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
                                        given: [
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
                    fields: [
                        { name: 'propertyId', type: 'string', required: true },
                    ],
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
                    fields: [
                        { name: 'propertyId', type: 'string', required: true },
                    ],
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

        const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
        const projectionFile = plans.find((p) =>
            p.outputPath.endsWith('projection.ts')
        );

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
            collectionName: 'available-properties-projection',
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
                   * Review and adjust the fields as needed for your read model.
                   */
                  return {
                    propertyId: event.data.propertyId,
                    title: event.data.title,
                    pricePerNight: event.data.pricePerNight,
                    location: event.data.location,
                    maxGuests: event.data.maxGuests,
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
});