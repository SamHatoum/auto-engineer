import { SpecsSchemaType as SpecsSchema } from '@auto-engineer/flowlang';

const specVariant1: SpecsSchema = {
    variant: 'specs',
    flows: [
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
                        description: 'A form that allows users to add items',
                        specs: ['have fields for id and description'],
                    },
                    server: {
                        description: 'Handles creation logic',
                        gwt: [
                            {
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
                },
                {
                    type: 'query',
                    name: 'Get available items',
                    description: 'Projection of available items',
                    client: {
                        description: 'Show available items',
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
                        gwt: [
                            {
                                given: [
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
                }
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
    ],
};

export default specVariant1;