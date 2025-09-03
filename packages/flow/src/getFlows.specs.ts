import { describe, expect, it } from 'vitest';
import { SpecsSchema } from './schema';
import { DataSource, QuerySlice } from './index';
import { fileURLToPath } from 'url';
import path from 'path';
import { NodeFileStore } from '@auto-engineer/file-store';
import { getFlows } from './getFlows';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vfs = new NodeFileStore();
const root = path.resolve(__dirname);

describe('getFlows', (_mode) => {
  // eslint-disable-next-line complexity
  it('loads multiple flows and generates correct schemas', async () => {
    const flows = await getFlows({ vfs, root: path.resolve(__dirname) });
    const schemas = flows.toSchema();

    const parseResult = SpecsSchema.safeParse(schemas);
    if (!parseResult.success) {
      console.error(`Schema validation errors:`, parseResult.error.format());
    }
    expect(parseResult.success).toBe(true);

    expect(schemas).toHaveProperty('variant', 'specs');
    expect(schemas).toHaveProperty('flows');
    expect(schemas).toHaveProperty('messages');
    expect(schemas).toHaveProperty('integrations');

    const flowsArray = schemas.flows;
    expect(Array.isArray(flowsArray)).toBe(true);
    expect(flowsArray.length).toBeGreaterThanOrEqual(2);

    const names = flowsArray.map((f: { name: string }) => f.name);
    expect(names).toContain('items');
    expect(names).toContain('Place order');

    const items = flowsArray.find((f: { name: string }) => f.name === 'items');
    const placeOrder = flowsArray.find((f: { name: string }) => f.name === 'Place order');
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
        expect(createItemSlice.server.specs).toBeDefined();
        const spec = createItemSlice.server.specs;
        expect(spec.name).toBeDefined();
        expect(spec.rules).toHaveLength(1);
        const rule = spec.rules[0];
        expect(rule.description).toBeDefined();
        expect(rule.examples).toHaveLength(1);
        const example = rule.examples[0];
        expect(typeof example.when === 'object' && !Array.isArray(example.when)).toBe(true);
        if (typeof example.when === 'object' && !Array.isArray(example.when)) {
          expect(example.when.commandRef).toBe('CreateItem');
          expect(example.when.exampleData).toMatchObject({
            itemId: 'item_123',
            description: 'A new item',
          });
        }
        expect(example.then).toHaveLength(1);
        expect(example.then[0]).toMatchObject({
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
      if (!data || !Array.isArray(data)) throw new Error('No data found in view items slice');

      expect(data).toHaveLength(1);
      expect(data[0].target).toMatchObject({ type: 'State', name: 'items' });
      expect(data[0].origin).toMatchObject({ name: 'ItemsProjection', type: 'projection' });

      const specs = viewItemSlice?.server?.specs;
      if (specs == null || specs.name === '') throw new Error('No specs found in view items slice');
      expect(specs).toBeDefined();
    }

    if (placeOrder) {
      expect(placeOrder.slices).toHaveLength(1);
      const submitOrderSlice = placeOrder.slices[0];
      expect(submitOrderSlice.type).toBe('command');
      expect(submitOrderSlice.name).toBe('Submit order');
      expect(submitOrderSlice.stream).toBe('order-${orderId}');

      if (submitOrderSlice.type === 'command') {
        expect(submitOrderSlice.client.specs).toContain('Order submission form');
        expect(submitOrderSlice.server.specs).toBeDefined();
        const spec = submitOrderSlice.server.specs;
        expect(spec.rules).toHaveLength(1);
        const rule = spec.rules[0];
        expect(rule.examples).toHaveLength(1);
        const example = rule.examples[0];
        expect(typeof example.when === 'object' && !Array.isArray(example.when)).toBe(true);
        if (typeof example.when === 'object' && !Array.isArray(example.when)) {
          expect(example.when.commandRef).toBe('PlaceOrder');
          expect(example.when.exampleData).toMatchObject({ productId: 'product_789', quantity: 3 });
        }
        expect(example.then).toHaveLength(1);
        expect(example.then[0]).toMatchObject({
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

    const messages = schemas.messages;
    expect(messages.length).toBeGreaterThan(0);

    const commandMessages = messages.filter((m) => m.type === 'command');
    const eventMessages = messages.filter((m) => m.type === 'event');

    expect(commandMessages.some((m) => m.name === 'CreateItem')).toBe(true);
    expect(commandMessages.some((m) => m.name === 'PlaceOrder')).toBe(true);
    expect(eventMessages.some((m) => m.name === 'ItemCreated')).toBe(true);
    expect(eventMessages.some((m) => m.name === 'OrderPlaced')).toBe(true);

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

  it('validates the complete schema with Zod', async () => {
    const flows = await getFlows({ vfs: vfs, root });
    const schemas = flows.toSchema();
    const parsed = SpecsSchema.parse(schemas);
    expect(parsed.variant).toBe('specs');
    expect(Array.isArray(parsed.flows)).toBe(true);
    expect(Array.isArray(parsed.messages)).toBe(true);
    expect(Array.isArray(parsed.integrations)).toBe(true);
  });

  it('handles flows with integrations', async () => {
    const flows = await getFlows({ vfs: vfs, root: root });
    const specsSchema = flows.toSchema();

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

  it('handles react slices correctly', async () => {
    const flows = await getFlows({ vfs: vfs, root: root });
    const specsSchema = flows.toSchema();

    const reactSlices = specsSchema.flows.flatMap((f) => f.slices.filter((s) => s.type === 'react'));
    reactSlices.forEach((slice) => {
      if (slice.type === 'react') {
        expect(slice.server).toBeDefined();
        expect(slice.server.specs).toBeDefined();
        expect(typeof slice.server.specs === 'object' && !Array.isArray(slice.server.specs)).toBe(true);
        const spec = slice.server.specs;
        expect(spec.rules).toBeDefined();
        expect(Array.isArray(spec.rules)).toBe(true);
        spec.rules.forEach((rule) => {
          rule.examples.forEach((example) => {
            expect(example.when).toBeDefined();
            expect(Array.isArray(example.when)).toBe(true);
            expect(example.then).toBeDefined();
            expect(Array.isArray(example.then)).toBe(true);
          });
        });
      }
    });
  });

  it('parses and validates a complete flow with all slice types', async () => {
    const flows = await getFlows({ vfs: vfs, root: root });
    const schemas = flows.toSchema();

    const validationResult = SpecsSchema.safeParse(schemas);
    if (!validationResult.success) {
      console.error(`Validation errors:`, JSON.stringify(validationResult.error.format(), null, 2));
    }
    expect(validationResult.success).toBe(true);

    const validatedData = validationResult.data!;
    expect(
      validatedData.flows.every((flow) =>
        flow.slices.every((slice) => {
          if (slice.type === 'command' || slice.type === 'query') {
            return slice.client !== undefined && slice.server !== undefined;
          } else if (slice.type === 'react') {
            return slice.server !== undefined;
          }
          return false;
        }),
      ),
    ).toBe(true);
  });

  it('should have ids for flows and slices that have ids', async () => {
    const flows = await getFlows({ vfs: vfs, root: root });

    const schemas = flows.toSchema();

    const testFlowWithIds = schemas.flows.find((f) => f.name === 'Test Flow with IDs');
    if (!testFlowWithIds) return;
    const commandSlice = testFlowWithIds.slices.find((s) => s.name === 'Create test item');
    expect(commandSlice?.id).toBe('SLICE-001');
    expect(commandSlice?.type).toBe('command');
    const querySlice = testFlowWithIds.slices.find((s) => s.name === 'Get test items');
    expect(querySlice?.id).toBe('SLICE-002');
    expect(querySlice?.type).toBe('query');
    const reactSlice = testFlowWithIds.slices.find((s) => s.name === 'React to test event');
    expect(reactSlice?.id).toBe('SLICE-003');
    expect(reactSlice?.type).toBe('react');
  });
});
