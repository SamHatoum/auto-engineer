import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flowlang';

describe('state.ts.ejs', () => {
  it('should generate an initial state', async () => {
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
                        title: 'nice apartment',
                        pricePerNight: 250,
                        available: true,
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
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'listedAt', type: 'Date', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'metadata', type: 'object', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, 'src/domain/flows');
    const stateFile = plans.find((p) => p.outputPath.endsWith('state.ts'));

    expect(stateFile?.contents).toMatchInlineSnapshot(`
          "/**
           * ## IMPLEMENTATION INSTRUCTIONS ##
           *
           * Define the shape of the domain state for the current slice below. This state is used by \`decide.ts\`
           * to determine whether a command is valid.
           *
           * The state is evolved over time by applying domain events (in \`evolve.ts\`).
           * Each event updates the state incrementally based on business rules.
           *
           * Guidelines:
           * - Include only fields that are **read** during command validation.
           * - Use discriminated unions (e.g., \`status: 'Pending' | 'Done'\`) to model state transitions.
           * - Prefer primitive types: \`string\`, \`boolean\`, \`number\`.
           * - Use objects or maps only when structure is essential for decision logic.
           *
           * Do NOT include:
           * - Redundant data already emitted in events unless required to enforce business rules.
           * - Fields used only for projections, UI, or query purposes.
           *
           * ### Example (for a Task domain):
           *
           * \`\`\`ts
           * export type PendingTask = {
           *   status: 'Pending';
           * };
           *
           * export type InProgressTask = {
           *   status: 'InProgress';
           *   startedAt: string;
           * };
           *
           * export type CompletedTask = {
           *   status: 'Completed';
           *   completedAt: string;
           * };
           *
           * export type State = PendingTask | InProgressTask | CompletedTask;
           * \`\`\`
           */

          // TODO: Replace with a discriminated union of domain states for the current slice
          export type State = {};

          // TODO: Replace the Return with the initial domain state of the current slice
          export const initialState = (): State => {
            return {};
          };
          "
        `);
  });
});
