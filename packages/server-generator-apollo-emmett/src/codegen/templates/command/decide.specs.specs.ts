import { describe, it, expect } from 'vitest';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flow';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';

describe('spec.ts.ejs', () => {
  it('should generate a valid spec file', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Host creates a listing',
          slices: [
            {
              type: 'command',
              name: 'Create listing',
              client: { description: '', specs: [] },
              server: {
                description: '',
                specs: {
                  name: 'Create listing spec',
                  rules: [
                    {
                      description: 'Should create listing successfully',
                      examples: [
                        {
                          description: 'User creates listing with valid data',
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
            { name: 'maxGuests', type: 'number', required: true },
            { name: 'amenities', type: 'string[]', required: true },
            { name: 'available', type: 'boolean', required: true },
            { name: 'tags', type: 'string[]', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'metadata', type: 'object', required: true },
            { name: 'listedAt', type: 'Date', required: true },
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
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
          "import { describe, it } from 'vitest';
          import { DeciderSpecification } from '@event-driven-io/emmett';
          import { decide } from './decide';
          import { evolve } from './evolve';
          import { initialState } from './state';

          describe('Host creates a listing | Create listing', () => {
            const given = DeciderSpecification.for({
              decide,
              evolve,
              initialState,
            });

            it('should emit ListingCreated for valid CreateListing', () => {
              given([])
                .when({
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
                    metadata: { foo: 'bar' },
                    listedAt: new Date('2024-01-15T10:00:00Z'),
                  },
                  metadata: { now: new Date() },
                })

                .then([
                  {
                    type: 'ListingCreated',
                    data: {
                      propertyId: 'listing_123',
                      listedAt: new Date('2024-01-15T10:00:00Z'),
                      rating: 4.8,
                      metadata: { foo: 'bar' },
                    },
                  },
                ]);
            });
          });
          "
        `);
  });
  it('should include given events in the spec file when provided', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Guest removes a listing',
          slices: [
            {
              type: 'command',
              name: 'Remove listing',
              client: { description: '', specs: [] },
              server: {
                description: '',
                specs: {
                  name: 'Remove listing spec',
                  rules: [
                    {
                      description: 'Should remove existing listing',
                      examples: [
                        {
                          description: 'Existing listing can be removed',
                          given: [
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
                                removedAt: '2024-01-16T10:00:00Z',
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
          name: 'RemoveListing',
          fields: [{ name: 'propertyId', type: 'string', required: true }],
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
          name: 'ListingRemoved',
          source: 'internal',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'removedAt', type: 'Date', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
      "import { describe, it } from 'vitest';
      import { DeciderSpecification } from '@event-driven-io/emmett';
      import { decide } from './decide';
      import { evolve } from './evolve';
      import { initialState } from './state';

      describe('Guest removes a listing | Remove listing', () => {
        const given = DeciderSpecification.for({
          decide,
          evolve,
          initialState,
        });

        it('should emit ListingRemoved for valid RemoveListing', () => {
          given([
            {
              type: 'ListingCreated',
              data: {
                propertyId: 'listing_123',
                listedAt: new Date('2024-01-15T10:00:00Z'),
                rating: 4.8,
                metadata: { foo: 'bar' },
              },
            },
          ])
            .when({
              type: 'RemoveListing',
              data: {
                propertyId: 'listing_123',
              },
              metadata: { now: new Date() },
            })

            .then([
              {
                type: 'ListingRemoved',
                data: {
                  propertyId: 'listing_123',
                  removedAt: new Date('2024-01-16T10:00:00Z'),
                },
              },
            ]);
        });
      });
      "
    `);
  });
});
