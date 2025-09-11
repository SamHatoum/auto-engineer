import { describe, expect, it, beforeEach } from 'vitest';
import { modelSchema } from './schema';
import { DataSource, QuerySlice } from './index';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { NodeFileStore } from '@auto-engineer/file-store';
import { getFlows } from './getFlows';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pattern = /\.(flow)\.(ts)$/;

describe(
  'getFlows',
  (_mode) => {
    let vfs: NodeFileStore;
    let root: string;

    beforeEach(() => {
      vfs = new NodeFileStore();
      root = path.resolve(__dirname);
    });
    // eslint-disable-next-line complexity
    it('loads multiple flows and generates correct models', async () => {
      const flows = await getFlows({ vfs, root: path.resolve(__dirname), pattern, fastFsScan: true });
      const schemas = flows.toModel();

      const parseResult = modelSchema.safeParse(schemas);
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
          expect(createItemSlice.client.specs).toBeDefined();
          expect(createItemSlice.client.specs?.name).toBe('A form that allows users to add items');
          expect(createItemSlice.client.specs?.rules).toHaveLength(1);
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
            if ('commandRef' in example.when) {
              expect(example.when.commandRef).toBe('CreateItem');
            }
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
        expect(viewItemSlice.client.specs).toBeDefined();
        expect(viewItemSlice.client.specs?.name).toBe('view Items Screen');
        expect(viewItemSlice.client.specs?.rules).toHaveLength(3);
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
          expect(submitOrderSlice.client.specs).toBeDefined();
          expect(submitOrderSlice.client.specs?.name).toBe('Order submission form');
          expect(submitOrderSlice.client.specs?.rules).toHaveLength(2);
          expect(submitOrderSlice.server.specs).toBeDefined();
          const spec = submitOrderSlice.server.specs;
          expect(spec.rules).toHaveLength(1);
          const rule = spec.rules[0];
          expect(rule.examples).toHaveLength(1);
          const example = rule.examples[0];
          expect(typeof example.when === 'object' && !Array.isArray(example.when)).toBe(true);
          if (typeof example.when === 'object' && !Array.isArray(example.when)) {
            if ('commandRef' in example.when) {
              expect(example.when.commandRef).toBe('PlaceOrder');
            }
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
      const flows = await getFlows({ vfs: vfs, root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
      const schemas = flows.toModel();
      const parsed = modelSchema.parse(schemas);
      expect(parsed.variant).toBe('specs');
      expect(Array.isArray(parsed.flows)).toBe(true);
      expect(Array.isArray(parsed.messages)).toBe(true);
      expect(Array.isArray(parsed.integrations)).toBe(true);
    });

    it('should handle flows with integrations', async () => {
      const flows = await getFlows({ vfs: vfs, root: root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
      const specsSchema = flows.toModel();

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
      const flows = await getFlows({ vfs: vfs, root: root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
      const specsSchema = flows.toModel();

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

    it('should parse and validate a complete flow with all slice types', async () => {
      const flows = await getFlows({ vfs: vfs, root: root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
      const schemas = flows.toModel();

      const validationResult = modelSchema.safeParse(schemas);
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
      const flows = await getFlows({ vfs: vfs, root: root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });

      const schemas = flows.toModel();

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

    it('should have ids for command slice rules', async () => {
      const flows = await getFlows({ vfs: vfs, root: root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
      const schemas = flows.toModel();

      const testFlowWithIds = schemas.flows.find((f) => f.name === 'Test Flow with IDs');
      if (!testFlowWithIds) return;

      const commandSlice = testFlowWithIds.slices.find((s) => s.name === 'Create test item');
      if (commandSlice?.type !== 'command') return;

      expect(commandSlice.server.specs.rules).toHaveLength(2);

      const rule1 = commandSlice.server.specs.rules.find(
        (r) => r.description === 'Valid test items should be created successfully',
      );
      expect(rule1?.id).toBe('RULE-001');

      const rule2 = commandSlice.server.specs.rules.find(
        (r) => r.description === 'Invalid test items should be rejected',
      );
      expect(rule2?.id).toBe('RULE-002');
    });

    it('should have ids for query slice rules', async () => {
      const flows = await getFlows({ vfs: vfs, root: root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
      const schemas = flows.toModel();

      const testFlowWithIds = schemas.flows.find((f) => f.name === 'Test Flow with IDs');
      if (!testFlowWithIds) return;

      const querySlice = testFlowWithIds.slices.find((s) => s.name === 'Get test items');
      if (querySlice?.type !== 'query') return;

      expect(querySlice.server.specs.rules).toHaveLength(1);

      const rule3 = querySlice.server.specs.rules.find(
        (r) => r.description === 'Items should be retrievable after creation',
      );
      expect(rule3?.id).toBe('RULE-003');
    });

    it('should have ids for react slice rules', async () => {
      const flows = await getFlows({ vfs: vfs, root: root, pattern: /\.(flow)\.(ts)$/, fastFsScan: true });
      const schemas = flows.toModel();

      const testFlowWithIds = schemas.flows.find((f) => f.name === 'Test Flow with IDs');
      if (!testFlowWithIds) return;

      const reactSlice = testFlowWithIds.slices.find((s) => s.name === 'React to test event');
      if (reactSlice?.type !== 'react') return;

      expect(reactSlice.server.specs.rules).toHaveLength(1);

      const rule4 = reactSlice.server.specs.rules.find(
        (r) => r.description === 'System should react to test item creation',
      );
      expect(rule4?.id).toBe('RULE-004');
    });

    it.skip('handles shopping-app Products state classification correctly', async () => {
      const flows = await getFlows({
        vfs,
        root: '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/shopping-app',
        pattern,
        fastFsScan: true,
      });
      const model = flows.toModel();

      const shoppingFlow = model.flows.find((f) => f.name === 'Seasonal Assistant');
      expect(shoppingFlow).toBeDefined();

      if (shoppingFlow) {
        const selectItemsSlice = shoppingFlow.slices.find(
          (s) => s.name === 'selects items relevant to the shopping criteria',
        );
        expect(selectItemsSlice?.type).toBe('command');

        if (selectItemsSlice?.type === 'command') {
          const example = selectItemsSlice.server?.specs?.rules[0]?.examples[0];
          if (example?.given && Array.isArray(example.given) && example.given.length > 0) {
            const givenItem = example.given[0];
            if (typeof givenItem === 'object' && givenItem !== null) {
              expect('stateRef' in givenItem).toBe(true);
              expect('eventRef' in givenItem).toBe(false);
              if ('stateRef' in givenItem) {
                expect(givenItem.stateRef).toBe('Products');
              }
            }
          }
        }
      }
    });

    it.skip('handles real questionnaires example correctly', async () => {
      const flows = await getFlows({
        vfs,
        root: '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires',
        pattern,
        fastFsScan: true,
      });
      const model = flows.toModel();

      const questionnaireFlow = model.flows.find((f) => f.name === 'Questionnaires');
      expect(questionnaireFlow).toBeDefined();

      if (questionnaireFlow) {
        const submitSlice = questionnaireFlow.slices.find((s) => s.name === 'submits the questionnaire');
        expect(submitSlice?.type).toBe('command');

        if (submitSlice?.type === 'command') {
          const example = submitSlice.server?.specs?.rules[0]?.examples[0];
          if (
            example !== null &&
            example !== undefined &&
            typeof example.when === 'object' &&
            example.when !== null &&
            !Array.isArray(example.when) &&
            'commandRef' in example.when
          ) {
            expect(example.when.commandRef).toBe('SubmitQuestionnaire');
          }
        }
      }
    });

    it('should handle flow type resolutions correctly', async () => {
      const questionnairePath = await createTestFlow();

      try {
        const flows = await getFlows({ vfs, root: path.dirname(questionnairePath), pattern, fastFsScan: true });
        const model = flows.toModel();
        const questionnaireFlow = model.flows.find((f) => f.name === 'questionnaires-test');
        expect(questionnaireFlow).toBeDefined();
        if (questionnaireFlow !== null && questionnaireFlow !== undefined) {
          validateSubmitQuestionnaireCommand(questionnaireFlow);
          validateQuestionAnsweredEvent(model);
          validateGivenSectionEventRefs(questionnaireFlow);
          validateCurrentQuestionIdType(model);
        }
      } finally {
        cleanupTestFile(questionnairePath);
      }
    });
  },
  { timeout: 5000 },
);

function createTestFlow(): Promise<string> {
  return new Promise((resolve) => {
    const questionnairePath = path.join(__dirname, 'samples/questionnaires.flow.ts');
    const questionnaireFlow = `
import { data, flow, should, specs, rule, example } from '../flow';
import { commandSlice, querySlice } from '../fluent-builder';
import gql from 'graphql-tag';
import { source } from '../data-flow-builders';
import { type Event, type Command, type State } from '../types';

type QuestionAnswered = Event<
  'QuestionAnswered',
  {
    questionnaireId: string;
    participantId: string;
    questionId: string;
    answer: unknown;
    savedAt: Date;
  }
>;

type SubmitQuestionnaire = Command<
  'SubmitQuestionnaire',
  {
    questionnaireId: string;
    participantId: string;
  }
>;

type AnswerQuestion = Command<
  'AnswerQuestion',
  {
    questionnaireId: string;
    participantId: string;
    questionId: string;
    answer: unknown;
  }
>;

type QuestionnaireProgress = State<
  'QuestionnaireProgress',
  {
    questionnaireId: string;
    participantId: string;
    status: 'in_progress' | 'ready_to_submit' | 'submitted';
    currentQuestionId: string | null;
    remainingQuestions: string[];
    answers: { questionId: string; value: unknown }[];
  }
>;

flow('questionnaires-test', () => {
  querySlice('views progress')
    .server(() => {
      specs('Questionnaire progress display', () => {
        rule('shows answered questions', () => {
          example('question already answered')
            .given<QuestionAnswered>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'q1',
              answer: 'Yes',
              savedAt: new Date('2030-01-01T09:05:00Z'),
            })
            .when({})
            .then<QuestionnaireProgress>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              status: 'in_progress',
              currentQuestionId: 'q2',
              remainingQuestions: ['q2', 'q3'],
              answers: [{ questionId: 'q1', value: 'Yes' }],
            });
        });
      });
    });
  
  commandSlice('submits questionnaire')
    .server(() => {
      specs('Questionnaire submission', () => {
        rule('allows submission when ready', () => {
          example('submit completed questionnaire')
            .when<SubmitQuestionnaire>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
            })
            .then<QuestionAnswered>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'final',
              answer: 'submitted',
              savedAt: new Date('2030-01-01T09:10:00Z'),
            });
        });
      });
    });
});
    `;

    if (!fs.existsSync(path.dirname(questionnairePath))) {
      fs.mkdirSync(path.dirname(questionnairePath), { recursive: true });
    }
    fs.writeFileSync(questionnairePath, questionnaireFlow);
    resolve(questionnairePath);
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions */

function validateSubmitQuestionnaireCommand(questionnaireFlow: any): void {
  const submitSlice = questionnaireFlow.slices.find((s: any) => s.name === 'submits questionnaire');
  expect(submitSlice?.type).toBe('command');
  if (submitSlice?.type === 'command') {
    const example = submitSlice.server?.specs?.rules[0]?.examples[0];
    if (
      example !== null &&
      example !== undefined &&
      typeof example.when === 'object' &&
      example.when !== null &&
      !Array.isArray(example.when) &&
      'commandRef' in example.when
    ) {
      expect(example.when.commandRef).toBe('SubmitQuestionnaire');
    }
  }
}

function validateQuestionAnsweredEvent(model: any): void {
  const questionAnsweredMessage = model.messages.find((m: any) => m.name === 'QuestionAnswered');
  expect(questionAnsweredMessage?.type).toBe('event');
}

function validateGivenSectionEventRefs(questionnaireFlow: any): void {
  const viewsSlice = questionnaireFlow.slices.find((s: any) => s.name === 'views progress');
  if (viewsSlice?.type === 'query') {
    const example = viewsSlice.server?.specs?.rules[0]?.examples[0];
    if (example?.given && Array.isArray(example.given) && example.given.length > 0) {
      const givenItem = example.given[0];
      if (typeof givenItem === 'object' && givenItem !== null) {
        expect('eventRef' in givenItem).toBe(true);
        expect('stateRef' in givenItem).toBe(false);
        if ('eventRef' in givenItem) {
          expect(givenItem.eventRef).toBe('QuestionAnswered');
        }
      }
    }
  }
}

function validateCurrentQuestionIdType(model: any): void {
  const progressMessage = model.messages.find((m: any) => m.name === 'QuestionnaireProgress');
  expect(progressMessage?.type).toBe('state');
  const currentQuestionIdField = progressMessage?.fields.find((f: any) => f.name === 'currentQuestionId');
  expect(currentQuestionIdField?.type).toBe('string | null');
}

/* eslint-enable */
function cleanupTestFile(questionnairePath: string): void {
  if (fs.existsSync(questionnairePath)) {
    fs.unlinkSync(questionnairePath);
  }
}
