import { describe, it, expect } from 'vitest';
import { getFlows } from './getFlows';
import { SpecsSchema } from './schema';
import { DataSource, QuerySlice } from './index';

describe('getFlows', () => {
  // eslint-disable-next-line complexity
  it('should load multiple flows and generate correct schemas', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();

    const parseResult = SpecsSchema.safeParse(schemas);
    if (!parseResult.success) {
      console.error('Schema validation errors:', parseResult.error.format());
    }
    expect(parseResult.success).toBe(true);

    expect(schemas).toHaveProperty('variant', 'specs');
    expect(schemas).toHaveProperty('flows');
    expect(schemas).toHaveProperty('messages');
    expect(schemas).toHaveProperty('integrations');

    const specsSchema = schemas;
    const flowsArray = specsSchema.flows;

    expect(Array.isArray(flowsArray)).toBe(true);
    expect(flowsArray.length).toBeGreaterThanOrEqual(2);

    const names = flowsArray.map((f) => f.name);
    expect(names).toContain('items');
    expect(names).toContain('Place order');

    const items = flowsArray.find((f) => f.name === 'items');
    const placeOrder = flowsArray.find((f) => f.name === 'Place order');
    expect(items).toBeDefined();
    expect(placeOrder).toBeDefined();
    if (items) {
      expect(items.slices).toHaveLength(2);
      const createItemSlice = items.slices[0];
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
          },
        });
      }
      const viewItemSlice = items.slices[1] as QuerySlice;
      expect(viewItemSlice.type).toBe('query');
      expect(viewItemSlice.name).toBe('view items');
      expect(viewItemSlice.request).toBeDefined();
      expect(viewItemSlice.request).toMatch(
        /query items\(\$itemId: String!\) {\s+items\(itemId: \$itemId\) {\s+id\s+description\s+}/,
      );
      const data = viewItemSlice?.server?.data as DataSource[] | undefined;
      if (!data || !Array.isArray(data)) {
        throw new Error('No data found in view items slice');
      }
      expect(data).toHaveLength(1);
      expect(data[0].target).toMatchObject({
        type: 'State',
        name: 'items',
      });
      expect(data[0].origin).toMatchObject({
        name: 'ItemsProjection',
        type: 'projection',
      });
      const gwt = viewItemSlice?.server?.gwt;
      if (!Array.isArray(gwt)) {
        throw new Error('No GWT found in view items slice');
      }
      expect(gwt).toHaveLength(1);
    }

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
          },
        });
      }
    }

    const messages = specsSchema.messages;
    expect(messages.length).toBeGreaterThan(0);

    const commandMessages = messages.filter((m) => m.type === 'command');
    const eventMessages = messages.filter((m) => m.type === 'event');

    expect(commandMessages.some((m) => m.name === 'CreateItem')).toBe(true);
    expect(commandMessages.some((m) => m.name === 'PlaceOrder')).toBe(true);
    expect(eventMessages.some((m) => m.name === 'ItemCreated')).toBe(true);
    expect(eventMessages.some((m) => m.name === 'OrderPlaced')).toBe(true);

    // Check message fields
    const createItemCommand = commandMessages.find((m) => m.name === 'CreateItem');
    if (createItemCommand) {
      expect(createItemCommand.fields).toContainEqual(
        expect.objectContaining({ name: 'itemId', type: 'string', required: true }),
      );
      expect(createItemCommand.fields).toContainEqual(
        expect.objectContaining({ name: 'description', type: 'string', required: true }),
      );
    }

    const itemCreatedEvent = eventMessages.find((m) => m.name === 'ItemCreated');
    if (itemCreatedEvent) {
      expect(itemCreatedEvent.fields).toContainEqual(
        expect.objectContaining({ name: 'id', type: 'string', required: true }),
      );
      expect(itemCreatedEvent.fields).toContainEqual(
        expect.objectContaining({ name: 'description', type: 'string', required: true }),
      );
      expect(itemCreatedEvent.fields).toContainEqual(
        expect.objectContaining({ name: 'addedAt', type: 'Date', required: true }),
      );
    }
  });

  it('should validate the complete schema with Zod', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();

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

    const flowsWithIntegrations = specsSchema.flows.filter((f) =>
      f.slices.some((s) => {
        if (s.type === 'command' || s.type === 'query') {
          return (
            s.server.data?.some(
              (d) =>
                ('destination' in d && d.destination?.type === 'integration') ||
                ('origin' in d && d.origin?.type === 'integration'),
            ) ?? false
          );
        }
        return false;
      }),
    );

    if (flowsWithIntegrations.length > 0) {
      expect(specsSchema?.integrations?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('should handle react slices correctly', async () => {
    const flows = await getFlows();
    const schemas = flows.toSchema();
    const specsSchema = schemas;

    const reactSlices = specsSchema.flows.flatMap((f) => f.slices.filter((s) => s.type === 'react'));

    reactSlices.forEach((slice) => {
      if (slice.type === 'react') {
        expect(slice.server).toBeDefined();
        expect(slice.server.gwt).toBeDefined();
        expect(Array.isArray(slice.server.gwt)).toBe(true);

        slice.server.gwt.forEach((gwt) => {
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

    const validationResult = SpecsSchema.safeParse(schemas);

    if (!validationResult.success) {
      console.error('Validation errors:', JSON.stringify(validationResult.error.format(), null, 2));
    }

    expect(validationResult.success).toBe(true);

    const validatedData = validationResult.data!;

    expect(
      validatedData.flows.every((flow) => {
        return flow.slices.every((slice) => {
          if (slice.type === 'command' || slice.type === 'query') {
            return slice.client !== undefined && slice.server !== undefined;
          } else if (slice.type === 'react') {
            return slice.server !== undefined;
          }
          return false;
        });
      }),
    ).toBe(true);
  });
});
