import { describe, it, expect } from 'vitest';
import { getFlows } from './getFlows';

describe('getFlows', () => {
  it('should load multiple flows and generate correct schemas', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();

    // Verify the schema structure matches SpecsSchema
    expect(schemas).toHaveProperty('variant', 'specs');
    expect(schemas).toHaveProperty('flows');
    expect(schemas).toHaveProperty('messages');
    expect(schemas).toHaveProperty('integrations');

    const schemasArray = (schemas as any).flows as Array<{ name: string; slices: unknown[] }>;

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
          stream: 'item-${id}',
          client: {
            description: '',
            specs: [
              'A form that allows users to add items'
            ],
          },
          server: {
            description: '',
            gwt: [
              {
                when: {
                  commandRef: 'CreateItem',
                  exampleData: {
                    itemId: 'item_123',
                    description: 'A new item',
                  }
                },
                then: [
                  {
                    eventRef: 'ItemCreated',
                    exampleData: {
                      id: 'item_123',
                      description: 'A new item',
                      addedAt: '2024-01-15T10:00:00.000Z',
                    }
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
          stream: 'order-${orderId}',
          client: {
            description: '',
            specs: [
              'Order submission form'
            ],
          },
          server: {
            description: '',
            gwt: [
              {
                when: {
                  commandRef: 'PlaceOrder',
                  exampleData: {
                    productId: 'product_789',
                    quantity: 3,
                  }
                },
                then: [
                  {
                    eventRef: 'OrderPlaced',
                    exampleData: {
                      orderId: 'order_001',
                      productId: 'product_789',
                      quantity: 3,
                      placedAt: '2024-01-20T10:00:00.000Z',
                    }
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
