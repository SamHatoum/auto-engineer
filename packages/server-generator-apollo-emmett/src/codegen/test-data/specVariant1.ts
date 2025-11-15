import { Model as SpecsSchema } from '@auto-engineer/narrative';

const specVariant1: SpecsSchema = {
  variant: 'specs',
  narratives: [
    {
      name: 'Add item',
      description: 'Flow to add items to a system',
      slices: [
        {
          type: 'command',
          stream: 'item-${itemId}',
          name: 'Create item',
          description: 'Handles item creation',
          client: {
            specs: [
              {
                type: 'describe',
                title: 'A form that allows users to add items',
                children: [{ type: 'it', title: 'have fields for id and description' }],
              },
            ],
          },

          server: {
            description: 'Handles creation logic',
            specs: {
              name: 'User can create an item',
              rules: [
                {
                  description: 'Valid item data should create item successfully',
                  examples: [
                    {
                      description: 'User creates a new item with valid data',
                      when: {
                        commandRef: 'CreateItem',
                        exampleData: {
                          itemId: 'item_123',
                          description: 'A new item',
                        },
                      },
                      then: [
                        {
                          eventRef: 'ItemCreated',
                          exampleData: {
                            id: 'item_123',
                            description: 'A new item',
                            addedAt: '2024-01-15T10:00:00.000Z',
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
        {
          type: 'query',
          name: 'Get available items',
          description: 'Projection of available items',
          client: {
            specs: [],
          },
          server: {
            description: 'Project items based on ItemCreated',
            data: [
              {
                origin: {
                  type: 'projection',
                  name: 'ItemCreated',
                  idField: 'id',
                },
                target: {
                  type: 'State',
                  name: 'AvailableItems',
                  fields: {
                    id: { type: 'string' },
                    description: { type: 'string' },
                    addedAt: { type: 'Date' },
                  },
                },
              },
            ],
            specs: {
              name: 'Items are available for viewing',
              rules: [
                {
                  description: 'Item becomes available after creation event',
                  examples: [
                    {
                      description: 'ItemCreated event makes item available',
                      when: [
                        {
                          eventRef: 'ItemCreated',
                          exampleData: {
                            id: 'item_123',
                            description: 'A new item',
                            addedAt: '2024-01-15T10:00:00.000Z',
                          },
                        },
                      ],
                      then: [
                        {
                          stateRef: 'AvailableItems',
                          exampleData: {
                            id: 'item_123',
                            description: 'A new item',
                            addedAt: '2024-01-15T10:00:00.000Z',
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
        {
          type: 'react',
          name: 'Notify on new item',
          description: 'Sends a notification command when a new item is created',
          server: {
            description: 'Triggers NotifyNewItem command in response to ItemCreated',
            specs: {
              name: 'Notify on new item creation',
              rules: [
                {
                  description: 'Should send notification when item is created',
                  examples: [
                    {
                      description: 'ItemCreated event triggers notification command',
                      when: [
                        {
                          eventRef: 'ItemCreated',
                          exampleData: {
                            id: 'item_123',
                            description: 'A new item',
                            addedAt: '2024-01-15T10:00:00.000Z',
                          },
                        },
                      ],
                      then: [
                        {
                          commandRef: 'NotifyNewItem',
                          exampleData: {
                            itemId: 'item_123',
                            message: 'A new item was added to the system.',
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
      name: 'CreateItem',
      description: 'Command to create a new item',
      fields: [
        { name: 'itemId', type: 'string', required: true },
        { name: 'description', type: 'string', required: true },
      ],
      metadata: {
        version: 1,
      },
    },
    {
      type: 'command',
      name: 'NotifyNewItem',
      description: 'Command to notify other systems when a new item is created',
      fields: [
        { name: 'itemId', type: 'string', required: true },
        { name: 'message', type: 'string', required: true },
      ],
      metadata: {
        version: 1,
      },
    },
    {
      type: 'event',
      name: 'ItemCreated',
      description: 'Event emitted when an item is created',
      source: 'internal',
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'description', type: 'string', required: true },
        { name: 'addedAt', type: 'Date', required: true },
      ],
      metadata: {
        version: 1,
      },
    },
    {
      type: 'state',
      name: 'AvailableItems',
      description: 'State representing available items in the system',
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'description', type: 'string', required: true },
        { name: 'addedAt', type: 'Date', required: true },
      ],
      metadata: {
        version: 1,
      },
    },
  ],
};

export default specVariant1;
