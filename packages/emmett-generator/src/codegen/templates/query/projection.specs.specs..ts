import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flowlang';

describe('projection.specs.ts.ejs', () => {
  it('should generate a valid test spec for a query slice projection', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'listing-flow',
          slices: [
            {
              type: 'command',
              name: 'CreateListing',
              stream: 'listing-${propertyId}',
              client: { description: '', specs: [] },
              server: {
                description: '',
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
              client: { description: '', specs: [] },
              server: {
                description: '',
                data: [
                  {
                    origin: {
                      type: 'projection',
                      idField: 'propertyId',
                      name: 'AvailablePropertiesProjection',
                    },
                    target: {
                      type: 'State',
                      name: 'AvailableListings',
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
          fields: [{ name: 'propertyId', type: 'string', required: true }],
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
          fields: [{ name: 'propertyId', type: 'string', required: true }],
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

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('projection.spec.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
"import { describe, it, beforeEach, expect } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  InMemoryProjectionSpec,
  eventsInStream,
  newEventsInStream
} from '@event-driven-io/emmett';
import { projection } from './projection';

import type { ListingCreated, ListingRemoved } from '../create-listing/events';
import type { AvailableListings } from './state';

type AllEvents = ListingCreated | ListingRemoved;

describe('AvailableListings projection', () => {
  let given: InMemoryProjectionSpec<AllEvents>;
  let propertyId: string;

  beforeEach(() => {
    propertyId = \`listing-\${uuid()}\`;
    given = InMemoryProjectionSpec.for({ projection });
  });

  it('handles ListingCreated', () =>
    given([])
      .when([
        {
          type: 'ListingCreated',
          data: {
            propertyId,
            title: 'Sea View Flat',
            pricePerNight: 120,
            location: 'Brighton',
            maxGuests: 4
          },
          metadata: {
            streamName: propertyId,
            streamPosition: 1n,
            globalPosition: 1n
          }
        }
      ])
      .then(async (state) => {
        const document = await state.database
          .collection<AvailableListings>('available-properties-projection')
          .findOne((doc) => doc.propertyId === propertyId);

        const expected: AvailableListings = {
          propertyId,
          title: 'Sea View Flat',
          pricePerNight: 120,
          location: 'Brighton',
          maxGuests: 4
        };

        expect(document).toMatchObject(expected);
      }));

  it('handles ListingRemoved', () =>
    given(
      eventsInStream(propertyId, [
        {
          type: 'ListingCreated',
          data: {
            propertyId,
            title: 'Sea View Flat',
            pricePerNight: 120,
            location: 'Brighton',
            maxGuests: 4
          }
        }
      ])
    )
      .when(
        newEventsInStream(propertyId, [
          {
            type: 'ListingRemoved',
            data: {
              propertyId
            }
          }
        ])
      )
      .then(async (state) => {
        const document = await state.database
          .collection<AvailableListings>('available-properties-projection')
          .findOne((doc) => doc.propertyId === propertyId);
        expect(document).toBeNull();
      }));
});
`);
  });
});
