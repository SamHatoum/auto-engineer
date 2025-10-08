import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { Model as SpecsSchema } from '@auto-engineer/flow';

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
              },
              server: {
                description: 'test',
                specs: {
                  name: 'Create listing command',
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

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
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
       * - Use discriminated unions with string literal types (e.g., \`status: 'pending' | 'done'\`) to model state transitions.
       * - IMPORTANT: If an enum exists in domain/shared/types.ts for your field (e.g., Status enum), use the enum constant type instead (e.g., \`status: Status.PENDING\`).
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
       *   status: 'pending';
       * };
       *
       * export type InProgressTask = {
       *   status: 'in_progress';
       *   startedAt: string;
       * };
       *
       * export type CompletedTask = {
       *   status: 'completed';
       *   completedAt: string;
       * };
       *
       * export type State = PendingTask | InProgressTask | CompletedTask;
       * \`\`\`
       *
       * Note: Status string literals should match your schema's enum values (usually snake_case).
       * If an enum is defined in domain/shared/types.ts, reference the enum type instead of literals.
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
