import { describe, it, expect } from 'vitest';
import { getFlows } from './getFlows';

describe('getFlows', () => {
  it('should load multiple flows and generate correct schemas', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();

    // Convert the Record to an array of values
    const schemasArray = Object.values(schemas) as Array<{ name: string; slices: unknown[] }>;
    
    expect(Array.isArray(schemasArray)).toBe(true);
    expect(schemasArray.length).toBeGreaterThanOrEqual(2);

    const names = schemasArray.map((f) => f.name);
    expect(names).toContain('Add item');
    expect(names).toContain('Place order');

    const addItem = schemasArray.find((f) => f.name === 'Add item');
    const placeOrder = schemasArray.find((f) => f.name === 'Place order');

    expect(addItem).toMatchObject({
      name: 'Add item',
      slices: [
        {
          type: 'command',
          name: 'Create item',
          client: {
            specs: [
              {
                description: 'A form that allows users to add items',
                should: ['have fields for id and description'],
              },
            ],
          },
          server: {
            specs: [
              {
                description: 'User can add an item',
                when: {
                  type: 'CreateItem',
                  data: {
                    itemId: 'item_123',
                    description: 'A new item',
                  },
                },
                then: [
                  {
                    type: 'ItemCreated',
                    data: {
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
      ],
    });

    expect(placeOrder).toMatchObject({
      name: 'Place order',
      slices: [
        {
          type: 'command',
          name: 'Submit order',
          client: {
            specs: [
              {
                description: 'Order submission form',
                should: ['allow product selection', 'allow quantity input'],
              },
            ],
          },
          server: {
            specs: [
              {
                description: 'User submits a new order',
                when: {
                  type: 'PlaceOrder',
                  data: {
                    productId: 'product_789',
                    quantity: 3,
                  },
                },
                then: [
                  {
                    type: 'OrderPlaced',
                    data: {
                      orderId: 'order_001',
                      productId: 'product_789',
                      quantity: 3,
                      placedAt: '2024-01-20T10:00:00.000Z',
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    });
  });
});
