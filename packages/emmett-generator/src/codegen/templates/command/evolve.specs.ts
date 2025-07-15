import { describe, it, expect } from 'vitest';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flowlang';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';

describe('evolve.ts.ejs', () => {
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
                gwt: [
                  {
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

          /**
           * ## IMPLEMENTATION INSTRUCTIONS ##
           *
           * This function defines how the domain state evolves in response to events.
           *
           * Guidelines:
           * - Apply only the **minimal** necessary changes for future decisions in \`decide.ts\`.
           * - Ignore any event fields not required for decision-making logic.
           * - If the event doesn’t change decision-relevant state, return the existing \`state\`.
           * - Prefer immutability: always return a **new state object**.
           * - Avoid spreading all of \`event.data\` unless all fields are relevant.
           */

          export const evolve = (state: State, event: ListingCreated): State => {
            switch (event.type) {
              case 'ListingCreated': {
                // TODO: Update state based on ListingCreated
                return {
                  ...state,
                };
              }
              default:
                return state;
            }
          };
          "
        `);
  });
});
