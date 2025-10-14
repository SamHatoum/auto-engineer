import { describe, it, expect } from 'vitest';
import { Model as SpecsSchema } from '@auto-engineer/narrative';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';

describe('decide.ts.ejs', () => {
  it('should generate a valid decide file when both command and event exist', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
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
                      description: 'Should create listing with valid data',
                      examples: [
                        {
                          description: 'User creates listing successfully',
                          when: {
                            commandRef: 'CreateListing',
                            exampleData: {
                              propertyId: 'listing_123',
                              title: 'Some apartment',
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
          fields: [],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, undefined, 'src/domain/flows');
    const decideFile = plans.find((p) => p.outputPath.endsWith('decide.ts'));

    expect(decideFile?.contents).toMatchInlineSnapshot(`
      "import { IllegalStateError } from '@event-driven-io/emmett';
      import type { State } from './state';
      import type { CreateListing } from './commands';
      import type { ListingCreated } from './events';

      export const decide = (command: CreateListing, _state: State): ListingCreated => {
        switch (command.type) {
          case 'CreateListing': {
            /**
             * ## IMPLEMENTATION INSTRUCTIONS ##
             *
             * This command can directly emit one or more events based on the input.
             *
             * You should:
             * - Validate the command input fields
             * - Inspect the current domain \`state\` to determine if the command is allowed
             * - If invalid, throw one of the following domain errors: \`NotFoundError\`, \`ValidationError\`, or \`IllegalStateError\`
             *   ⚠️ Error constructors: NotFoundError takes { id, type, message? }, while IllegalStateError/ValidationError take string
             * - If valid, return one or more events with the correct structure
             *
             * ⚠️ Only read from inputs — never mutate them. \`evolve.ts\` handles state updates.
             */

            // return {
            //   type: 'ListingCreated',
            //   data: { ...command.data },
            // } as ListingCreated;

            throw new IllegalStateError('Not yet implemented: ' + command.type);
          }
          default:
            throw new IllegalStateError(\`Unexpected command type: \${String(command.type)}\`);
        }
      };
      "
    `);
  });

  it('should include implementation instructions when prior events are required', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
        {
          name: 'Host removes a listing',
          slices: [
            {
              type: 'command',
              name: 'Remove listing',
              client: {
                description: 'test',
              },
              server: {
                description: 'test',
                specs: {
                  name: 'Remove listing command',
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
                                removedAt: '2024-01-16T12:00:00Z',
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

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, undefined, 'src/domain/flows');
    const decideFile = plans.find((p) => p.outputPath.endsWith('decide.ts'));

    expect(decideFile?.contents).toMatchInlineSnapshot(`
      "import { IllegalStateError } from '@event-driven-io/emmett';
      import type { State } from './state';
      import type { RemoveListing } from './commands';
      import type { ListingRemoved } from './events';

      export const decide = (command: RemoveListing, _state: State): ListingRemoved => {
        switch (command.type) {
          case 'RemoveListing': {
            /**
             * ## IMPLEMENTATION INSTRUCTIONS ##
             *
             * This command requires evaluating prior state to determine if it can proceed.
             *
             * You should:
             * - Validate the command input fields
             * - Inspect the current domain \`state\` to determine if the command is allowed
             * - If invalid, throw one of the following domain errors: \`NotFoundError\`, \`ValidationError\`, or \`IllegalStateError\`
             *   ⚠️ Error constructors: NotFoundError takes { id, type, message? }, while IllegalStateError/ValidationError take string
             * - If valid, return one or more events with the correct structure
             *
             * ⚠️ Only read from inputs — never mutate them. \`evolve.ts\` handles state updates.
             */

            // return {
            //   type: 'ListingRemoved',
            //   data: { ...command.data },
            // } as ListingRemoved;

            throw new IllegalStateError('Not yet implemented: ' + command.type);
          }
          default:
            throw new IllegalStateError(\`Unexpected command type: \${String(command.type)}\`);
        }
      };
      "
    `);
  });

  it('should generate a decide file that handles multiple GWTs including an error', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
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
                      description: 'Should handle multiple scenarios including errors',
                      examples: [
                        {
                          description: 'User creates listing successfully',
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
                        {
                          description: 'User creates listing with empty title should fail',
                          when: {
                            commandRef: 'CreateListing',
                            exampleData: {
                              propertyId: 'listing_123',
                              title: '',
                              listedAt: '2024-01-15T10:00:00Z',
                              rating: 4.8,
                              metadata: {},
                            },
                          },
                          then: [
                            {
                              errorType: 'ValidationError',
                              message: 'Title must not be empty',
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
            { name: 'listedAt', type: 'Date', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'metadata', type: 'object', required: true },
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

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, undefined, 'src/domain/flows');
    const decideFile = plans.find((p) => p.outputPath.endsWith('decide.ts'));

    expect(decideFile?.contents).toMatchInlineSnapshot(`
      "import { IllegalStateError, ValidationError } from '@event-driven-io/emmett';
      import type { State } from './state';
      import type { CreateListing } from './commands';
      import type { ListingCreated } from './events';

      export const decide = (command: CreateListing, _state: State): ListingCreated => {
        switch (command.type) {
          case 'CreateListing': {
            /**
             * ## IMPLEMENTATION INSTRUCTIONS ##
             *
             * This command can directly emit one or more events based on the input.
             *
             * You should:
             * - Validate the command input fields
             * - Inspect the current domain \`state\` to determine if the command is allowed
             * - If invalid, throw one of the following domain errors: \`NotFoundError\`, \`ValidationError\`, or \`IllegalStateError\`
             *   ⚠️ Error constructors: NotFoundError takes { id, type, message? }, while IllegalStateError/ValidationError take string
             * - If valid, return one or more events with the correct structure
             *
             * ⚠️ Only read from inputs — never mutate them. \`evolve.ts\` handles state updates.
             */

            if (command.data.title === '') {
              throw new ValidationError('Title must not be empty');
            }

            // return {
            //   type: 'ListingCreated',
            //   data: { ...command.data },
            // } as ListingCreated;

            throw new IllegalStateError('Not yet implemented: ' + command.type);
          }
          default:
            throw new IllegalStateError(\`Unexpected command type: \${String(command.type)}\`);
        }
      };
      "
    `);
  });

  it('should include integration return type and usage in decide function', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
        {
          name: 'Assistant suggests items',
          slices: [
            {
              type: 'command',
              name: 'Suggest Items',
              stream: 'session-${sessionId}',
              client: {
                description: 'test',
              },
              server: {
                description: '',
                data: [
                  {
                    target: {
                      type: 'Command',
                      name: 'SuggestItems',
                    },
                    destination: {
                      type: 'integration',
                      systems: ['AI'],
                      message: {
                        name: 'DoChat',
                        type: 'command',
                      },
                    },
                    _additionalInstructions: 'Ensure systemPrompt includes product catalogue guidance',
                    _withState: {
                      target: {
                        type: 'State',
                        name: 'Products',
                      },
                      origin: {
                        type: 'integration',
                        systems: ['product-catalog'],
                      },
                    },
                  },
                  {
                    target: {
                      type: 'Event',
                      name: 'ItemsSuggested',
                    },
                    destination: {
                      type: 'stream',
                      pattern: 'session-${sessionId}',
                    },
                  },
                ],
                specs: {
                  name: 'Suggest items command',
                  rules: [
                    {
                      description: 'Should suggest items successfully',
                      examples: [
                        {
                          description: 'User requests item suggestions',
                          when: {
                            commandRef: 'SuggestItems',
                            exampleData: {
                              sessionId: 'session-123',
                              prompt: 'What should I buy?',
                            },
                          },
                          then: [
                            {
                              eventRef: 'ItemsSuggested',
                              exampleData: {
                                sessionId: 'session-123',
                                items: [],
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
          name: 'SuggestItems',
          fields: [
            { name: 'sessionId', type: 'string', required: true },
            { name: 'prompt', type: 'string', required: true },
          ],
        },
        {
          type: 'command',
          name: 'DoChat',
          fields: [
            { name: 'sessionId', type: 'string', required: true },
            { name: 'prompt', type: 'string', required: true },
            { name: 'systemPrompt', type: 'string', required: false },
          ],
        },
        {
          type: 'event',
          name: 'ItemsSuggested',
          source: 'internal',
          fields: [
            { name: 'sessionId', type: 'string', required: true },
            { name: 'items', type: 'Array<object>', required: true },
          ],
        },
        {
          type: 'state',
          name: 'Products',
          fields: [
            {
              name: 'products',
              type: 'Array<{ id: string, name: string }>',
              required: true,
            },
          ],
        },
      ],
      integrations: [
        {
          name: 'AI',
          source: '@auto-engineer/ai-integration',
          description: '',
        },
        {
          name: 'product-catalog',
          source: '@auto-engineer/product-catalogue-integration',
          description: '',
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, spec.integrations);
    const decideFile = plans.find((p) => p.outputPath.endsWith('decide.ts'));

    expect(decideFile?.contents).toMatchInlineSnapshot(`
      "import { IllegalStateError } from '@event-driven-io/emmett';
      import type { State } from './state';
      import type { SuggestItems } from './commands';
      import type { ItemsSuggested } from './events';
      import type { Products } from '@auto-engineer/product-catalogue-integration';

      export const decide = (command: SuggestItems, _state: State, products?: Products): ItemsSuggested => {
        switch (command.type) {
          case 'SuggestItems': {
            /**
             * ## IMPLEMENTATION INSTRUCTIONS ##
             *
             * This command can directly emit one or more events based on the input.
             *
             * You should:
             * - Validate the command input fields
             * - Inspect the current domain \`state\` to determine if the command is allowed
             * - Use \`products\` (integration result) to enrich or filter the output
             * - If invalid, throw one of the following domain errors: \`NotFoundError\`, \`ValidationError\`, or \`IllegalStateError\`
             *   ⚠️ Error constructors: NotFoundError takes { id, type, message? }, while IllegalStateError/ValidationError take string
             * - If valid, return one or more events with the correct structure
             *
             * ⚠️ Only read from inputs — never mutate them. \`evolve.ts\` handles state updates.
             *
             * Integration result shape (Products):
             * products?.data = {
             *   products: Array<{
             *     id: string;
             *     name: string };
             *   }>;
             * }
             */

            // return {
            //   type: 'ItemsSuggested',
            //   data: { ...command.data },
            // } as ItemsSuggested;

            throw new IllegalStateError('Not yet implemented: ' + command.type);
          }
          default:
            throw new IllegalStateError(\`Unexpected command type: \${String(command.type)}\`);
        }
      };
      "
    `);
  });
});
