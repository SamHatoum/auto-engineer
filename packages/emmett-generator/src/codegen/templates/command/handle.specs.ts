import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flowlang';

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
                gwt: [
                  {
                    when: {
                      commandRef: 'CreateListing',
                      exampleData: {
                        propertyId: 'listing_123',
                        title: 'Modern Downtown Apartment',
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
            { name: 'title', type: 'string', required: true },
            { name: 'listedAt', type: 'Date', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'metadata', type: 'object', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
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
  it('should generate a valid handle file with integration', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Assistant suggests items',
          slices: [
            {
              type: 'command',
              name: 'Suggest Items',
              stream: 'session-${sessionId}',
              client: {
                description: 'test',
                specs: [],
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
                gwt: [
                  {
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
          source: '@auto-engineer/product-catalog-integration',
          description: '',
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, spec.integrations, 'src/domain/flows');
    const handleFile = plans.find((p) => p.outputPath.endsWith('handle.ts'));

    expect(handleFile?.contents).toMatchInlineSnapshot(`
      "import { AI } from '@auto-engineer/ai-integration';
      import { Products } from '@auto-engineer/product-catalog-integration';
      import { CommandHandler, type EventStore, type MessageHandlerResult } from '@event-driven-io/emmett';
      import { evolve } from './evolve';
      import { initialState } from './state';
      import { decide } from './decide';
      import type { SuggestItems } from './commands';

      /**
       * ## IMPLEMENTATION INSTRUCTIONS ##
       *
       * Ensure systemPrompt includes product catalogue guidance
       */
      const handler = CommandHandler({
        evolve,
        initialState,
      });

      export const handle = async (eventStore: EventStore, command: SuggestItems): Promise<MessageHandlerResult> => {
        const streamId = \`session-\${command.data.sessionId}\`;

        try {
          // TODO: Map fields from the incoming command to this integration input.
          // - Use relevant fields from \`command.data\` to populate the required inputs below.
          // - Some fields may require transformation or enrichment.
          // - If additional context is needed, construct it here.
          // const products: Products | undefined = await AI.Commands?.DoChat<Products>({
          //   type: 'DoChat',
          //   data: {
          //    // sessionId: ???
          // prompt: ???
          // systemPrompt: ???
          //   },
          // });

          await handler(eventStore, streamId, (state) =>
            // TODO: add products as a parameter to decide once implemented above
            decide(command, state /* products */),
          );
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
