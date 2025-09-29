import { describe, expect, it, beforeEach } from 'vitest';
import { modelSchema } from './schema';
import { DataSource, Example, Flow, Model, modelToFlow, QuerySlice } from './index';
import { fileURLToPath } from 'url';
import path from 'path';
import { NodeFileStore, InMemoryFileStore } from '@auto-engineer/file-store';
import { getFlows } from './getFlows';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pattern = /\.(flow)\.(ts)$/;

describe('getFlows', (_mode) => {
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
          } else if (slice.type === 'experience') {
            return slice.client !== undefined;
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

  it.skip('extracts correct integration import paths from AST', async () => {
    const flows = await getFlows({
      vfs,
      root: '../../examples/shopping-app',
      pattern,
      fastFsScan: true,
    });
    const model = flows.toModel();
    expect(model.integrations).toBeDefined();
    expect(Array.isArray(model.integrations)).toBe(true);
    expect((model.integrations?.length ?? 0) > 0).toBe(true);
    const aiIntegration = model.integrations?.find((i) => i.name === 'AI');
    const productCatalogIntegration = model.integrations?.find((i) => i.name === 'ProductCatalog');

    if (aiIntegration) {
      expect(aiIntegration.source).toBe('../server/src/integrations');
    }

    if (productCatalogIntegration) {
      expect(productCatalogIntegration.source).toBe('../server/src/integrations');
    }
  });

  it('should handle when examples correctly', async () => {
    const flows = await getFlows({
      vfs,
      root,
      pattern: /(?:^|\/)questionnaires\.flow\.(?:ts|tsx|js|jsx|mjs|cjs)$/,
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

  it('should correctly assign commandRef correctly', async () => {
    const flows = await getFlows({
      vfs,
      root,
      pattern: /(?:^|\/)questionnaires\.flow\.(?:ts|tsx|js|jsx|mjs|cjs)$/,
      fastFsScan: true,
    });
    const model = flows.toModel();
    validateCommandRef(model);
  });

  it('should handle experience slice with client specs', async () => {
    const memoryVfs = new InMemoryFileStore();
    const flowWithExperienceContent = `
import { flow, experience, should, specs } from '@auto-engineer/flow';

flow('Test Experience Flow', () => {
  experience('Homepage', 'AUTO-H1a4Bn6Cy').client(() => {
    specs(() => {
      should('show a hero section with a welcome message');
      should('allow user to start the questionnaire');
    });
  });
});
      `;

    await memoryVfs.write('/test/experience.flow.ts', new TextEncoder().encode(flowWithExperienceContent));

    const flows = await getFlows({ vfs: memoryVfs, root: '/test', pattern, fastFsScan: true });
    const model = flows.toModel();

    const experienceFlow = model.flows.find((f) => f.name === 'Test Experience Flow');
    expect(experienceFlow).toBeDefined();

    if (experienceFlow) {
      const homepageSlice = experienceFlow.slices.find((s) => s.name === 'Homepage');
      expect(homepageSlice).toBeDefined();
      expect(homepageSlice?.type).toBe('experience');

      if (homepageSlice?.type === 'experience') {
        expect(homepageSlice.client).toBeDefined();
        expect(homepageSlice.client.specs).toBeDefined();
        expect(homepageSlice.client.specs?.rules).toBeDefined();
        expect(homepageSlice.client.specs?.rules).toHaveLength(2);

        const rules = homepageSlice.client.specs?.rules;
        if (rules && Array.isArray(rules)) {
          expect(rules).toHaveLength(2);
          expect(rules[0]).toBe('show a hero section with a welcome message');
          expect(rules[1]).toBe('allow user to start the questionnaire');
        }
      }
    }
  });

  it('simulates browser execution with transpiled CommonJS code', async () => {
    const memoryVfs = new InMemoryFileStore();
    const flowContent = `
import { flow, experience, should, specs } from '@auto-engineer/flow';

flow('Browser Test Flow', () => {
  experience('HomePage').client(() => {
    specs(() => {
      should('render correctly');
    });
  });
});
      `;

    await memoryVfs.write('/browser/test.flow.ts', new TextEncoder().encode(flowContent));

    const { executeAST } = await import('./loader');
    const { registry } = await import('./flow-registry');

    registry.clearAll();

    await executeAST(['/browser/test.flow.ts'], memoryVfs, {}, '/browser');

    const flows = registry.getAllFlows();
    expect(flows).toHaveLength(1);
    expect(flows[0].name).toBe('Browser Test Flow');
    expect(flows[0].slices).toHaveLength(1);

    const slice = flows[0].slices[0];
    expect(slice.type).toBe('experience');
    expect(slice.name).toBe('HomePage');

    if (slice.type === 'experience') {
      expect(slice.client).toBeDefined();
      expect(slice.client.specs).toBeDefined();
      expect(slice.client.specs?.rules).toHaveLength(1);
      expect(slice.client.specs?.rules?.[0]).toBe('render correctly');
    }
  });

  it('handles experience slice with ES module interop correctly', async () => {
    const memoryVfs = new InMemoryFileStore();

    const { executeAST } = await import('./loader');
    const { registry } = await import('./flow-registry');

    const flowContent = `
import { flow, experience } from '@auto-engineer/flow';

flow('Questionnaires', 'AUTO-Q9m2Kp4Lx', () => {
  experience('Homepage', 'AUTO-H1a4Bn6Cy').client(() => {});
});
      `;

    await memoryVfs.write('/browser/questionnaires.flow.ts', new TextEncoder().encode(flowContent));

    registry.clearAll();

    await expect(executeAST(['/browser/questionnaires.flow.ts'], memoryVfs, {}, '/browser')).resolves.toBeDefined();

    const flows = registry.getAllFlows();
    expect(flows).toHaveLength(1);
    expect(flows[0].name).toBe('Questionnaires');
    expect(flows[0].slices).toHaveLength(1);

    const slice = flows[0].slices[0];
    expect(slice.type).toBe('experience');
    expect(slice.name).toBe('Homepage');
  });

  it('should handle flow type resolutions correctly', async () => {
    const memoryVfs = new InMemoryFileStore();
    const questionnaireFlowContent = `
import { data, flow, should, specs, rule, example } from '../flow';
import { command, query } from '../fluent-builder';
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
  query('views progress')
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
  
  command('submits questionnaire')
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

    await memoryVfs.write('/test/questionnaires.flow.ts', new TextEncoder().encode(questionnaireFlowContent));

    const flows = await getFlows({ vfs: memoryVfs, root: '/test', pattern, fastFsScan: true });
    const model = flows.toModel();
    const testFlow = model.flows.find((f) => f.name === 'questionnaires-test');
    expect(testFlow).toBeDefined();
    if (testFlow !== null && testFlow !== undefined) {
      validateSubmitQuestionnaireCommand(testFlow);
      validateQuestionAnsweredEvent(model);
      validateGivenSectionEventRefs(testFlow);
      validateCurrentQuestionIdType(model);
    }
  });

  it('correctly distinguishes between State and Event types in given clauses with empty when', async () => {
    const flows = await getFlows({ vfs, root, pattern, fastFsScan: true });
    const model = flows.toModel();

    const mixedGivenFlow = model.flows.find((f) => f.name === 'Mixed Given Types');
    expect(mixedGivenFlow).toBeDefined();

    if (!mixedGivenFlow) return;

    const querySlice = mixedGivenFlow.slices.find((s) => s.name === 'system status check');
    expect(querySlice).toBeDefined();
    expect(querySlice?.type).toBe('query');

    if (querySlice?.type !== 'query') return;

    const example = querySlice.server.specs.rules[0]?.examples[0];
    expect(example).toBeDefined();

    if (example !== null && example !== undefined) {
      validateMixedGivenTypes(example);
      validateEmptyWhenClause(example);
      validateThenClause(example);
      validateMixedGivenTypeMessages(model);
    }
  });

  it('does not emit empty generics for empty when()', async () => {
    const flows = await getFlows({
      vfs,
      root,
      pattern: /(?:^|\/)questionnaires\.flow\.(?:ts|tsx|js|jsx|mjs|cjs)$/,
      fastFsScan: true,
    });

    const model = flows.toModel();
    const code = await modelToFlow(model);

    // Should not produce `.when<>({})` for empty when-clauses
    expect(code).not.toMatch(/\.when<>\(\{\}\)/);

    // should render empty whens as `.when({})` for empty when-clauses
    const emptyWhenCount = (code.match(/\.when\(\{\}\)/g) ?? []).length;
    expect(emptyWhenCount).toBeGreaterThanOrEqual(2);
    expect(code).not.toMatch(/\.when<\s*\{\s*\}\s*>\(\{\}\)/);
  });

  it('should not generate phantom messages with empty names', async () => {
    const flows = await getFlows({
      vfs,
      root: root,
      pattern: /(?:^|\/)questionnaires\.flow\.(?:ts|tsx|js|jsx|mjs|cjs)$/,
      fastFsScan: true,
    });
    const model = flows.toModel();

    const phantomMessages = model.messages.filter((message) => message.name === '');
    expect(phantomMessages).toHaveLength(0);

    const allMessages = model.messages;
    expect(allMessages.every((message) => message.name.length > 0)).toBe(true);
  });

  it('reproduces the questionnaires bug: submits the questionnaire should use SubmitQuestionnaire, not SendQuestionnaireLink', async () => {
    const model = await createQuestionnaireBugTestModel();
    validateQuestionnaireBugFix(model);
  });
});

function validateSubmitQuestionnaireCommand(questionnaireFlow: Flow): void {
  const submitSlice = questionnaireFlow.slices.find((s) => s.name === 'submits questionnaire');
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

function validateQuestionAnsweredEvent(model: Model): void {
  const questionAnsweredMessage = model.messages.find((m) => m.name === 'QuestionAnswered');
  expect(questionAnsweredMessage?.type).toBe('event');
}

function validateGivenSectionEventRefs(questionnaireFlow: Flow): void {
  const viewsSlice = questionnaireFlow.slices.find((s) => s.name === 'views progress');
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

function validateCurrentQuestionIdType(model: Model): void {
  const progressMessage = model.messages.find((m) => m.name === 'QuestionnaireProgress');
  expect(progressMessage?.type).toBe('state');
  const currentQuestionIdField = progressMessage?.fields.find((f) => f.name === 'currentQuestionId');
  expect(currentQuestionIdField?.type).toBe('string | null');
}

function validateMixedGivenTypes(example: Example): void {
  expect(example.description).toBe('system with 2 items reaches max of 2');
  expect(example.given).toBeDefined();
  expect(Array.isArray(example.given)).toBe(true);

  if (!example.given) return;

  expect(example.given).toHaveLength(4);

  const firstGiven = example.given[0];
  expect('stateRef' in firstGiven).toBe(true);
  expect('eventRef' in firstGiven).toBe(false);
  if ('stateRef' in firstGiven) {
    expect(firstGiven.stateRef).toBe('ConfigState');
  }

  const secondGiven = example.given[1];
  expect('eventRef' in secondGiven).toBe(true);
  if ('eventRef' in secondGiven) {
    expect(secondGiven.eventRef).toBe('SystemInitialized');
  }

  const thirdGiven = example.given[2];
  expect('eventRef' in thirdGiven).toBe(true);
  if ('eventRef' in thirdGiven) {
    expect(thirdGiven.eventRef).toBe('ItemAdded');
  }

  const fourthGiven = example.given[3];
  expect('eventRef' in fourthGiven).toBe(true);
  if ('eventRef' in fourthGiven) {
    expect(fourthGiven.eventRef).toBe('ItemAdded');
  }
}

function validateEmptyWhenClause(example: Example): void {
  expect(example.when).toBeDefined();
  expect(typeof example.when === 'object' && !Array.isArray(example.when)).toBe(true);
  if (typeof example.when === 'object' && !Array.isArray(example.when)) {
    expect('commandRef' in example.when).toBe(false);
    expect('eventRef' in example.when).toBe(true);
    expect('stateRef' in example.when).toBe(false);
    if ('eventRef' in example.when) {
      expect(example.when.eventRef).toBe('');
    }
    expect(example.when.exampleData).toEqual({});
  }
}

function validateThenClause(example: Example): void {
  expect(example.then).toBeDefined();
  expect(Array.isArray(example.then)).toBe(true);
  expect(example.then).toHaveLength(1);

  const thenOutcome = example.then[0];
  expect('stateRef' in thenOutcome).toBe(true);
  if ('stateRef' in thenOutcome) {
    expect(thenOutcome.stateRef).toBe('SystemStatus');
  }
}

function validateMixedGivenTypeMessages(model: Model): void {
  const configStateMessage = model.messages.find((m) => m.name === 'ConfigState');
  expect(configStateMessage).toBeDefined();
  expect(configStateMessage?.type).toBe('state');

  const systemInitializedMessage = model.messages.find((m) => m.name === 'SystemInitialized');
  expect(systemInitializedMessage).toBeDefined();
  expect(systemInitializedMessage?.type).toBe('event');

  const itemAddedMessage = model.messages.find((m) => m.name === 'ItemAdded');
  expect(itemAddedMessage).toBeDefined();
  expect(itemAddedMessage?.type).toBe('event');

  const systemStatusMessage = model.messages.find((m) => m.name === 'SystemStatus');
  expect(systemStatusMessage).toBeDefined();
  expect(systemStatusMessage?.type).toBe('state');
}

async function createQuestionnaireBugTestModel(): Promise<Model> {
  const memoryVfs = new InMemoryFileStore();
  const questionnaireFlowContent = getQuestionnaireFlowContent();
  await memoryVfs.write('/test/questionnaires-bug.flow.ts', new TextEncoder().encode(questionnaireFlowContent));
  const flows = await getFlows({ vfs: memoryVfs, root: '/test', pattern, fastFsScan: true });
  return flows.toModel();
}

function getQuestionnaireFlowContent(): string {
  return `
import {
  command,
  query,
  experience,
  flow,
  should,
  specs,
  rule,
  example,
  gql,
  source,
  data,
  sink,
  type Command,
  type Event,
  type State,
} from '@auto-engineer/flow';

type SendQuestionnaireLink = Command<
  'SendQuestionnaireLink',
  {
    questionnaireId: string;
    participantId: string;
  }
>;

type QuestionnaireLinkSent = Event<
  'QuestionnaireLinkSent',
  {
    questionnaireId: string;
    participantId: string;
    link: string;
    sentAt: Date;
  }
>;

type QuestionnaireSubmitted = Event<
  'QuestionnaireSubmitted',
  {
    questionnaireId: string;
    participantId: string;
    submittedAt: Date;
  }
>;

type SubmitQuestionnaire = Command<
  'SubmitQuestionnaire',
  {
    questionnaireId: string;
    participantId: string;
  }
>;

flow('Questionnaires', 'AUTO-Q9m2Kp4Lx', () => {
  command('sends the questionnaire link', 'AUTO-S2b5Cp7Dz')
    .server(() => {
      specs(() => {
        rule('questionnaire link is sent to participant', 'AUTO-r0A1Bo8X', () => {
          example('sends the questionnaire link successfully')
            .when<SendQuestionnaireLink>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
            })
            .then<QuestionnaireLinkSent>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              link: 'https://app.example.com/q/q-001?participant=participant-abc',
              sentAt: new Date('2030-01-01T09:00:00Z'),
            });
        });
      });
      data([sink().event('QuestionnaireLinkSent').toStream('questionnaire-participantId')]);
    })
    .request(gql\`
      mutation SendQuestionnaireLink($input: SendQuestionnaireLinkInput!) {
        sendQuestionnaireLink(input: $input) {
          success
        }
      }
    \`)
    .client(() => {
      specs('Questionnaire Link', () => {
        should('display a confirmation message when the link is sent');
        should('handle errors when the link cannot be sent');
      });
    });

  command('submits the questionnaire', 'AUTO-T5k9Jw3V')
    .server(() => {
      specs(() => {
        rule('questionnaire allowed to be submitted when all questions are answered', 'AUTO-r4H0Lx4U', () => {
          example('submits the questionnaire successfully')
            .when<SubmitQuestionnaire>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
            })
            .then<QuestionnaireSubmitted>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              submittedAt: new Date('2030-01-01T09:00:00Z'),
            });
        });
      });
      data([sink().event('QuestionnaireSubmitted').toStream('questionnaire-participantId')]);
    })
    .request(gql\`
      mutation SubmitQuestionnaire($input: SubmitQuestionnaireInput!) {
        submitQuestionnaire(input: $input) {
          success
        }
      }
    \`)
    .client(() => {
      specs('Submission Confirmation', () => {
        should('display a confirmation message upon successful submission');
      });
    });
});`;
}

function validateQuestionnaireBugFix(model: Model): void {
  const questionnaireFlow = getQuestionnaireFlowFromModel(model);
  const submitSlice = getSubmitSlice(questionnaireFlow);
  const submitExample = getSubmitExample(submitSlice);

  validateSubmitCommandRef(submitExample);
  validateLinkSliceCommandRef(questionnaireFlow);
}

function getQuestionnaireFlowFromModel(model: Model): Flow {
  const questionnaireFlow = model.flows.find((f) => f.name === 'Questionnaires');
  expect(questionnaireFlow).toBeDefined();
  if (questionnaireFlow === null || questionnaireFlow === undefined) {
    throw new Error('Questionnaire flow not found');
  }
  return questionnaireFlow;
}

function getSubmitSlice(questionnaireFlow: Flow): {
  type: 'command';
  server: { specs: { rules: { examples: unknown[] }[] } };
} {
  const submitSlice = questionnaireFlow.slices.find((s) => s.name === 'submits the questionnaire');
  expect(submitSlice).toBeDefined();
  expect(submitSlice?.type).toBe('command');
  if (submitSlice?.type !== 'command') {
    throw new Error('Submit slice is not a command');
  }
  return submitSlice as { type: 'command'; server: { specs: { rules: { examples: unknown[] }[] } } };
}

function getSubmitExample(submitSlice: { server: { specs: { rules: { examples: unknown[] }[] } } }): unknown {
  const rule = submitSlice.server?.specs?.rules[0];
  expect(rule).toBeDefined();
  expect(rule?.examples).toHaveLength(1);
  const example = rule?.examples[0];
  expect((example as { description?: string })?.description).toBe('submits the questionnaire successfully');
  return example;
}

function validateSubmitCommandRef(example: unknown): void {
  const ex = example as { when?: { commandRef?: string } };
  expect(ex?.when).toBeDefined();
  if (typeof ex?.when === 'object' && ex.when !== null && !Array.isArray(ex.when) && 'commandRef' in ex.when) {
    expect(ex.when.commandRef).toBe('SubmitQuestionnaire');
    expect(ex.when.commandRef).not.toBe('SendQuestionnaireLink');
  } else {
    throw new Error('Expected when to have commandRef property');
  }
}

function validateLinkSliceCommandRef(questionnaireFlow: Flow): void {
  const linkSlice = questionnaireFlow.slices.find((s) => s.name === 'sends the questionnaire link');
  expect(linkSlice?.type).toBe('command');
  if (linkSlice?.type === 'command') {
    const linkExample = linkSlice.server?.specs?.rules[0]?.examples[0];
    const ex = linkExample as { when?: { commandRef?: string } };
    if (typeof ex?.when === 'object' && ex.when !== null && !Array.isArray(ex.when) && 'commandRef' in ex.when) {
      expect(ex.when.commandRef).toBe('SendQuestionnaireLink');
    }
  }
}

function validateCommandRef(model: Model): void {
  const questionnaireFlow = getQuestionnaireFlowFromModel(model);
  const submitSlice = getSubmitSliceFromFlow(questionnaireFlow);
  const serverSpecs = getServerSpecsFromSlice(submitSlice);
  const rule = getFirstRuleFromSpecs(serverSpecs);
  const example = getFirstExampleFromRule(rule);

  validateExampleCommandRef(example);
  validateThenEvents(example);
}

function getSubmitSliceFromFlow(questionnaireFlow: Flow): unknown {
  const submitSlice = questionnaireFlow.slices.find((s) => s.name === 'submits the questionnaire');
  expect(submitSlice).toBeDefined();
  expect(submitSlice?.type).toBe('command');
  if (submitSlice?.type !== 'command') {
    throw new Error('Submit slice is not a command');
  }
  return submitSlice;
}

function getServerSpecsFromSlice(submitSlice: unknown): unknown {
  const slice = submitSlice as { server?: { specs?: unknown } };
  const serverSpecs = slice.server?.specs;
  expect(serverSpecs).toBeDefined();
  const specs = serverSpecs as { rules?: unknown[] };
  expect(specs?.rules).toBeDefined();
  expect(specs?.rules).toHaveLength(1);
  return serverSpecs;
}

function getFirstRuleFromSpecs(serverSpecs: unknown): unknown {
  const specs = serverSpecs as { rules?: unknown[] };
  const rule = specs?.rules?.[0];
  expect(rule).toBeDefined();
  const r = rule as { description?: string; examples?: unknown[] };
  expect(r?.description).toBe('questionnaire allowed to be submitted when all questions are answered');
  expect(r?.examples).toBeDefined();
  expect(r?.examples).toHaveLength(1);
  return rule;
}

function getFirstExampleFromRule(rule: unknown): unknown {
  const r = rule as { examples?: unknown[] };
  const example = r?.examples?.[0];
  expect(example).toBeDefined();
  const ex = example as { description?: string };
  expect(ex?.description).toBe('submits the questionnaire successfully');
  return example;
}

function validateExampleCommandRef(example: unknown): void {
  const ex = example as { when?: { commandRef?: string; exampleData?: unknown } };
  expect(ex?.when).toBeDefined();
  if (typeof ex?.when === 'object' && ex.when !== null && !Array.isArray(ex.when) && 'commandRef' in ex.when) {
    expect(ex.when.commandRef).toBe('SubmitQuestionnaire');
    expect(ex.when.commandRef).not.toBe('SendQuestionnaireLink');
    expect(ex.when.exampleData).toEqual({
      questionnaireId: 'q-001',
      participantId: 'participant-abc',
    });
  } else {
    throw new Error('Expected when to have commandRef property');
  }
}

function validateThenEvents(example: unknown): void {
  const ex = example as { then?: unknown[] };
  expect(ex?.then).toBeDefined();
  expect(Array.isArray(ex?.then)).toBe(true);
  expect(ex?.then).toHaveLength(1);

  const thenEvent = ex?.then?.[0];
  if (thenEvent !== null && thenEvent !== undefined && 'eventRef' in (thenEvent as object)) {
    const event = thenEvent as { eventRef?: string; exampleData?: unknown };
    expect(event.eventRef).toBe('QuestionnaireSubmitted');
    expect(event.exampleData).toEqual({
      questionnaireId: 'q-001',
      participantId: 'participant-abc',
      submittedAt: new Date('2030-01-01T09:00:00.000Z'),
    });
  }
}
