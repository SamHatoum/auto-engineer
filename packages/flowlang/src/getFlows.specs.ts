import { describe, it, expect } from 'vitest';
import { getFlows } from './getFlows';
import { SpecsSchema } from './schema';

describe('getFlows', () => {
  it('should load multiple flows and generate correct schemas', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();

    // First, validate the schema with Zod
    const parseResult = SpecsSchema.safeParse(schemas);
    if (!parseResult.success) {
      console.error('Schema validation errors:', parseResult.error.format());
    }
    expect(parseResult.success).toBe(true);

    // Verify the schema structure matches SpecsSchema
    expect(schemas).toHaveProperty('variant', 'specs');
    expect(schemas).toHaveProperty('flows');
    expect(schemas).toHaveProperty('messages');
    expect(schemas).toHaveProperty('integrations');

    const specsSchema = schemas;
    const flowsArray = specsSchema.flows;

    expect(Array.isArray(flowsArray)).toBe(true);
    expect(flowsArray.length).toBeGreaterThanOrEqual(2);

    const names = flowsArray.map((f) => f.name);
    expect(names).toContain('Add item');
    expect(names).toContain('Place order');

    const addItem = flowsArray.find((f) => f.name === 'Add item');
    const placeOrder = flowsArray.find((f) => f.name === 'Place order');

    expect(addItem).toBeDefined();
    expect(placeOrder).toBeDefined();

    // Check Add item flow structure
    if (addItem) {
      expect(addItem.slices).toHaveLength(1);
      const createItemSlice = addItem.slices[0];

      expect(createItemSlice.type).toBe('command');
      expect(createItemSlice.name).toBe('Create item');
      expect(createItemSlice.stream).toBe('item-${id}');

      if (createItemSlice.type === 'command') {
        expect(createItemSlice.client.specs).toContain('A form that allows users to add items');

        expect(createItemSlice.server.gwt).toHaveLength(1);
        const gwt = createItemSlice.server.gwt[0];

        expect(gwt.when.commandRef).toBe('CreateItem');
        expect(gwt.when.exampleData).toMatchObject({
          itemId: 'item_123',
          description: 'A new item',
        });

        expect(gwt.then).toHaveLength(1);
        expect(gwt.then[0]).toMatchObject({
          eventRef: 'ItemCreated',
          exampleData: {
            id: 'item_123',
            description: 'A new item',
            addedAt: new Date('2024-01-15T10:00:00.000Z'),
          }
        });
      }
    }

    // Check Place order flow structure
    if (placeOrder) {
      expect(placeOrder.slices).toHaveLength(1);
      const submitOrderSlice = placeOrder.slices[0];

      expect(submitOrderSlice.type).toBe('command');
      expect(submitOrderSlice.name).toBe('Submit order');
      expect(submitOrderSlice.stream).toBe('order-${orderId}');

      if (submitOrderSlice.type === 'command') {
        expect(submitOrderSlice.client.specs).toContain('Order submission form');

        expect(submitOrderSlice.server.gwt).toHaveLength(1);
        const gwt = submitOrderSlice.server.gwt[0];

        expect(gwt.when.commandRef).toBe('PlaceOrder');
        expect(gwt.when.exampleData).toMatchObject({
          productId: 'product_789',
          quantity: 3,
        });

        expect(gwt.then).toHaveLength(1);
        expect(gwt.then[0]).toMatchObject({
          eventRef: 'OrderPlaced',
          exampleData: {
            orderId: 'order_001',
            productId: 'product_789',
            quantity: 3,
            placedAt: new Date('2024-01-20T10:00:00.000Z'),
          }
        });
      }
    }

    // Check messages were extracted correctly
    const messages = specsSchema.messages;
    expect(messages.length).toBeGreaterThan(0);

    const commandMessages = messages.filter(m => m.type === 'command');
    const eventMessages = messages.filter(m => m.type === 'event');

    expect(commandMessages.some(m => m.name === 'CreateItem')).toBe(true);
    expect(commandMessages.some(m => m.name === 'PlaceOrder')).toBe(true);
    expect(eventMessages.some(m => m.name === 'ItemCreated')).toBe(true);
    expect(eventMessages.some(m => m.name === 'OrderPlaced')).toBe(true);

    // Check message fields
    const createItemCommand = commandMessages.find(m => m.name === 'CreateItem');
    if (createItemCommand) {
      expect(createItemCommand.fields).toContainEqual(
          expect.objectContaining({ name: 'itemId', type: 'string', required: true })
      );
      expect(createItemCommand.fields).toContainEqual(
          expect.objectContaining({ name: 'description', type: 'string', required: true })
      );
    }

    const itemCreatedEvent = eventMessages.find(m => m.name === 'ItemCreated');
    if (itemCreatedEvent) {
      expect(itemCreatedEvent.fields).toContainEqual(
          expect.objectContaining({ name: 'id', type: 'string', required: true })
      );
      expect(itemCreatedEvent.fields).toContainEqual(
          expect.objectContaining({ name: 'description', type: 'string', required: true })
      );
      expect(itemCreatedEvent.fields).toContainEqual(
          expect.objectContaining({ name: 'addedAt', type: 'Date', required: true })
      );
    }
  });

  it('should validate the complete schema with Zod', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();

    // This should not throw
    const parsed = SpecsSchema.parse(schemas);

    expect(parsed.variant).toBe('specs');
    expect(Array.isArray(parsed.flows)).toBe(true);
    expect(Array.isArray(parsed.messages)).toBe(true);
    expect(Array.isArray(parsed.integrations)).toBe(true);
  });

  it('should handle flows with integrations', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();
    const specsSchema = schemas;

    // If there are any flows with integrations, check they're extracted
    const flowsWithIntegrations = specsSchema.flows.filter(f =>
        f.slices.some(s => {
            if (s.type === 'command' || s.type === 'query') {
                return s.server.data?.some((d) =>
                    'destination' in d && d.destination?.type === 'integration' ||
                    'origin' in d && d.origin?.type === 'integration'
                ) ?? false;
            }
            return false;
        })
    );

    if (flowsWithIntegrations.length > 0) {
      expect(specsSchema?.integrations?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('should handle react slices correctly', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();
    const specsSchema = schemas;

    // Check if any react slices exist and are properly formatted
    const reactSlices = specsSchema.flows.flatMap(f =>
        f.slices.filter(s => s.type === 'react')
    );

    reactSlices.forEach(slice => {
      if (slice.type === 'react') {
        expect(slice.server).toBeDefined();
        expect(slice.server.gwt).toBeDefined();
        expect(Array.isArray(slice.server.gwt)).toBe(true);

        slice.server.gwt.forEach(gwt => {
          expect(gwt.when).toBeDefined();
          expect(Array.isArray(gwt.when)).toBe(true);
          expect(gwt.then).toBeDefined();
          expect(Array.isArray(gwt.then)).toBe(true);
        });
      }
    });
  });

  it('should parse and validate a complete flow with all slice types', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();

    // Validate with Zod - this ensures all data conforms to the schema
    const validationResult = SpecsSchema.safeParse(schemas);

    if (!validationResult.success) {
      // Log detailed errors for debugging
      console.error('Validation errors:', JSON.stringify(validationResult.error.format(), null, 2));
    }

    expect(validationResult.success).toBe(true);

    // If validation passes, we know the data structure is correct
    const validatedData = validationResult.data!;

    // Check that flows maintain their structure after validation
    expect(validatedData.flows.every(flow => {
      return flow.slices.every(slice => {
        if (slice.type === 'command' || slice.type === 'query') {
          return slice.client !== undefined && slice.server !== undefined;
        } else if (slice.type === 'react') {
          return slice.server !== undefined;
        }
        return false;
      });
    })).toBe(true);
  });
});