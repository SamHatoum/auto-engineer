import {describe, it, expect} from 'vitest';
import {SpecsSchemaType as SpecsSchema} from "@auto-engineer/flowlang";
import {generateScaffoldFilePlans} from "../../scaffoldFromSchema";

describe('commands.ts.ejs', () => {
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
          "import { Command } from '@event-driven-io/emmett';
          export type CreateListing = Command<
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
});