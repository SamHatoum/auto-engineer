import { describe, it, expect } from 'vitest';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';
import { Model as SpecsSchema } from '@auto-engineer/narrative';

describe('projection.specs.ts.ejs', () => {
  it('should generate a valid test spec for a query slice projection', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
        {
          name: 'listing-flow',
          slices: [
            {
              type: 'command',
              name: 'CreateListing',
              stream: 'listing-${propertyId}',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'CreateListing command',
                  rules: [
                    {
                      description: 'Should handle listing operations',
                      examples: [
                        {
                          description: 'User creates listing successfully',
                          when: {
                            commandRef: 'CreateListing',
                            exampleData: {
                              propertyId: 'listing_123',
                              title: 'Sea View Flat',
                              pricePerNight: 120,
                              location: 'Brighton',
                              maxGuests: 4,
                            },
                          },
                          then: [
                            {
                              eventRef: 'ListingCreated',
                              exampleData: {
                                propertyId: 'listing_123',
                                title: 'Sea View Flat',
                                pricePerNight: 120,
                                location: 'Brighton',
                                maxGuests: 4,
                              },
                            },
                          ],
                        },
                        {
                          description: 'User removes listing successfully',
                          when: {
                            commandRef: 'RemoveListing',
                            exampleData: {
                              propertyId: 'listing_123',
                            },
                          },
                          then: [
                            {
                              eventRef: 'ListingRemoved',
                              exampleData: {},
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
              name: 'search-listings',
              stream: 'listings',
              client: { description: '' },
              server: {
                description: '',
                data: [
                  {
                    origin: {
                      type: 'projection',
                      idField: 'propertyId',
                      name: 'AvailablePropertiesProjection',
                    },
                    target: {
                      type: 'State',
                      name: 'AvailableListings',
                    },
                  },
                ],
                specs: {
                  name: 'Search listings query',
                  rules: [
                    {
                      description: 'Should project listings correctly',
                      examples: [
                        {
                          description: 'Listing created shows in search results',
                          when: [
                            {
                              eventRef: 'ListingCreated',
                              exampleData: {
                                propertyId: 'listing_123',
                                title: 'Sea View Flat',
                                pricePerNight: 120,
                                location: 'Brighton',
                                maxGuests: 4,
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'AvailableListings',
                              exampleData: {
                                propertyId: 'listing_123',
                                title: 'Sea View Flat',
                                pricePerNight: 120,
                                location: 'Brighton',
                                maxGuests: 4,
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
          name: 'CreateListing',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'pricePerNight', type: 'number', required: true },
            { name: 'location', type: 'string', required: true },
            { name: 'maxGuests', type: 'number', required: true },
          ],
        },
        {
          type: 'command',
          name: 'RemoveListing',
          fields: [{ name: 'propertyId', type: 'string', required: true }],
        },
        {
          type: 'event',
          name: 'ListingCreated',
          source: 'internal',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'pricePerNight', type: 'number', required: true },
            { name: 'location', type: 'string', required: true },
            { name: 'maxGuests', type: 'number', required: true },
          ],
        },
        {
          type: 'event',
          name: 'ListingRemoved',
          source: 'internal',
          fields: [{ name: 'propertyId', type: 'string', required: true }],
        },
        {
          type: 'state',
          name: 'AvailableListings',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'pricePerNight', type: 'number', required: true },
            { name: 'location', type: 'string', required: true },
            { name: 'maxGuests', type: 'number', required: true },
          ],
        },
      ],
    } as SpecsSchema;

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('projection.specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
      "import { describe, it, beforeEach, expect } from 'vitest';
      import { InMemoryProjectionSpec } from '@event-driven-io/emmett';
      import { projection } from './projection';
      import type { ListingCreated } from '../create-listing/events';
      import { AvailableListings } from './state';

      type ProjectionEvent = ListingCreated;

      describe('Should project listings correctly', () => {
        let given: InMemoryProjectionSpec<ProjectionEvent>;

        beforeEach(() => {
          given = InMemoryProjectionSpec.for({ projection });
        });

        it('Listing created shows in search results', () =>
          given([])
            .when([
              {
                type: 'ListingCreated',
                data: {
                  propertyId: 'listing_123',
                  title: 'Sea View Flat',
                  pricePerNight: 120,
                  location: 'Brighton',
                  maxGuests: 4,
                },
                metadata: {
                  streamName: 'listings',
                  streamPosition: 1n,
                  globalPosition: 1n,
                },
              },
            ])
            .then(async (state) => {
              const document = await state.database
                .collection<AvailableListings>('AvailablePropertiesProjection')
                .findOne((doc) => doc.propertyId === 'listing_123');

              const expected: AvailableListings = {
                propertyId: 'listing_123',
                title: 'Sea View Flat',
                pricePerNight: 120,
                location: 'Brighton',
                maxGuests: 4,
              };

              expect(document).toMatchObject(expected);
            }));
      });
      "
    `);
  });

  it('should generate a valid test spec for a model with given/when/then pattern', async () => {
    const questionnaireSpec: SpecsSchema = {
      variant: 'specs',
      narratives: [
        {
          name: 'Questionnaires',
          slices: [
            {
              name: 'views the questionnaire',
              type: 'query',
              client: { description: '' },
              server: {
                description: '',
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'QuestionnaireProgress',
                    },
                    origin: {
                      type: 'projection',
                      name: 'Questionnaires',
                      idField: 'questionnaire-participantId',
                    },
                  },
                ],
                specs: {
                  name: '',
                  rules: [
                    {
                      description: 'questionnaires show current progress',
                      examples: [
                        {
                          description: 'a question has already been answered',
                          given: [
                            {
                              eventRef: 'QuestionnaireLinkSent',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                link: 'https://app.example.com/q/q-001?participant=participant-abc',
                                sentAt: '2030-01-01T09:00:00.000Z',
                              },
                            },
                          ],
                          when: [
                            {
                              eventRef: 'QuestionAnswered',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                questionId: 'q1',
                                answer: 'Yes',
                                savedAt: '2030-01-01T09:05:00.000Z',
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                status: 'in_progress',
                                currentQuestionId: 'q2',
                                remainingQuestions: ['q2', 'q3'],
                                answers: [
                                  {
                                    questionId: 'q1',
                                    value: 'Yes',
                                  },
                                ],
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
          type: 'event',
          name: 'QuestionnaireLinkSent',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'link', type: 'string', required: true },
            { name: 'sentAt', type: 'Date', required: true },
          ],
          source: 'internal',
        },
        {
          type: 'event',
          name: 'QuestionAnswered',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
            { name: 'savedAt', type: 'Date', required: true },
          ],
          source: 'internal',
        },
        {
          type: 'state',
          name: 'QuestionnaireProgress',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'status', type: '"in_progress" | "ready_to_submit" | "submitted"', required: true },
            { name: 'currentQuestionId', type: 'string | null', required: true },
            { name: 'remainingQuestions', type: 'Array<string>', required: true },
            { name: 'answers', type: 'Array<{ questionId: string; value: unknown }>', required: true },
          ],
        },
      ],
    } as SpecsSchema;

    const plans = await generateScaffoldFilePlans(
      questionnaireSpec.narratives,
      questionnaireSpec.messages,
      undefined,
      'src/domain/flows',
    );
    const specFile = plans.find((p) => p.outputPath.endsWith('projection.specs.ts'));

    expect(specFile?.contents).toContain('a question has already been answered');
    expect(specFile?.contents).toContain('QuestionnaireLinkSent');
    expect(specFile?.contents).toContain('QuestionAnswered');
    expect(specFile?.contents).toContain('given([');
    expect(specFile?.contents).toContain('.when([');
  });

  it('should include all events from both given and when clauses in projection imports and types', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
        {
          name: 'questionnaires',
          slices: [
            {
              type: 'command',
              name: 'sends-the-questionnaire-link',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Sends questionnaire link',
                  rules: [
                    {
                      description: 'sends questionnaire link to participant',
                      examples: [
                        {
                          description: 'sends link successfully',
                          when: {
                            commandRef: 'SendQuestionnaireLink',
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                            },
                          },
                          then: [
                            {
                              eventRef: 'QuestionnaireLinkSent', // This event is produced here
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                link: 'https://app.example.com/q/q-001?participant=participant-abc',
                                sentAt: new Date('2030-01-01T09:00:00Z'),
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
              type: 'command',
              name: 'submits-a-questionnaire-answer',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Submits questionnaire answer',
                  rules: [
                    {
                      description: 'submits answer successfully',
                      examples: [
                        {
                          description: 'answers question',
                          when: {
                            commandRef: 'AnswerQuestion',
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                              questionId: 'q1',
                              answer: 'Yes',
                            },
                          },
                          then: [
                            {
                              eventRef: 'QuestionAnswered', // This event is produced here
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                questionId: 'q1',
                                answer: 'Yes',
                                savedAt: new Date('2030-01-01T09:05:00Z'),
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
              name: 'views-the-questionnaire',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Views the questionnaire',
                  rules: [
                    {
                      description: 'questionnaires show current progress',
                      examples: [
                        {
                          description: 'a question has already been answered',
                          given: [
                            {
                              eventRef: 'QuestionnaireLinkSent',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                link: 'https://app.example.com/q/q-001?participant=participant-abc',
                                sentAt: new Date('2030-01-01T09:00:00Z'),
                              },
                            },
                          ],
                          when: [
                            {
                              eventRef: 'QuestionAnswered', // This should be included in imports!
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                questionId: 'q1',
                                answer: 'Yes',
                                savedAt: new Date('2030-01-01T09:05:00Z'),
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'QuestionnaireProgress',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                status: 'in_progress',
                                currentQuestionId: 'q2',
                                remainingQuestions: ['q2'],
                                answers: [{ questionId: 'q1', value: 'Yes' }],
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                data: [
                  {
                    origin: { name: 'Questionnaires', idField: 'questionnaireId-participantId' },
                    target: { name: 'QuestionnaireProgress' },
                  },
                ],
              },
            },
          ],
        },
      ],
      messages: [
        {
          type: 'event',
          name: 'QuestionnaireLinkSent',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'link', type: 'string', required: true },
            { name: 'sentAt', type: 'Date', required: true },
          ],
        },
        {
          type: 'event',
          name: 'QuestionAnswered',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
            { name: 'savedAt', type: 'Date', required: true },
          ],
        },
        {
          type: 'state',
          name: 'QuestionnaireProgress',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'status', type: '"in_progress" | "ready_to_submit" | "submitted"', required: true },
            { name: 'currentQuestionId', type: 'string | null', required: true },
            { name: 'remainingQuestions', type: 'Array<string>', required: true },
            { name: 'answers', type: 'Array<{ questionId: string; value: unknown }>', required: true },
          ],
        },
      ],
    } as SpecsSchema;

    const plans = await generateScaffoldFilePlans(
      spec.narratives,
      [
        {
          type: 'command',
          name: 'SendQuestionnaireLink',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
          ],
        },
        {
          type: 'command',
          name: 'AnswerQuestion',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
          ],
        },
        ...spec.messages,
      ],
      undefined,
      'src/domain/flows',
    );

    // Check projection.specs.ts file
    const specsFile = plans.find((p) => p.outputPath.endsWith('projection.specs.ts'));
    expect(specsFile?.contents).toBeDefined();

    // Must import BOTH event types
    expect(specsFile?.contents).toContain('import type { QuestionnaireLinkSent }');
    expect(specsFile?.contents).toContain('import type { QuestionAnswered }');

    // Union type must include BOTH events (order may vary due to sorting)
    expect(specsFile?.contents).toContain('type ProjectionEvent = QuestionAnswered | QuestionnaireLinkSent');

    // Check projection.ts file
    const projectionFile = plans.find((p) => p.outputPath.endsWith('projection.ts'));
    expect(projectionFile?.contents).toBeDefined();

    // Must import BOTH event types
    expect(projectionFile?.contents).toContain('import type { QuestionnaireLinkSent }');
    expect(projectionFile?.contents).toContain('import type { QuestionAnswered }');

    // AllEvents type must include BOTH events (order may vary due to sorting)
    expect(projectionFile?.contents).toContain('type AllEvents = QuestionAnswered | QuestionnaireLinkSent');

    // canHandle must include BOTH events
    expect(projectionFile?.contents).toContain("canHandle: ['QuestionnaireLinkSent', 'QuestionAnswered']");
  });

  it('should generate a valid test spec for singleton projection', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
        {
          name: 'todo-flow',
          slices: [
            {
              type: 'command',
              name: 'manage-todo',
              stream: 'todo-${todoId}',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Manage todo command',
                  rules: [
                    {
                      description: 'Should handle todo operations',
                      examples: [
                        {
                          description: 'User adds todo',
                          when: {
                            commandRef: 'AddTodo',
                            exampleData: {
                              todoId: 'todo_123',
                              title: 'Buy milk',
                            },
                          },
                          then: [
                            {
                              eventRef: 'TodoAdded',
                              exampleData: {
                                todoId: 'todo_123',
                                title: 'Buy milk',
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
              name: 'view-summary',
              stream: 'todos',
              client: { description: '' },
              server: {
                description: '',
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'TodoSummary',
                    },
                    origin: {
                      type: 'projection',
                      name: 'TodoSummaryProjection',
                      singleton: true,
                    },
                  },
                ],
                specs: {
                  name: 'View summary query',
                  rules: [
                    {
                      description: 'Should aggregate todo counts',
                      examples: [
                        {
                          description: 'Todo added updates count',
                          when: [
                            {
                              eventRef: 'TodoAdded',
                              exampleData: {
                                todoId: 'todo_123',
                                title: 'Buy milk',
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'TodoSummary',
                              exampleData: {
                                totalCount: 1,
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
          name: 'AddTodo',
          fields: [
            { name: 'todoId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
          ],
        },
        {
          type: 'event',
          name: 'TodoAdded',
          source: 'internal',
          fields: [
            { name: 'todoId', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
          ],
        },
        {
          type: 'state',
          name: 'TodoSummary',
          fields: [{ name: 'totalCount', type: 'number', required: true }],
        },
      ],
    } as SpecsSchema;

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('view-summary/projection.specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
      "import { describe, it, beforeEach, expect } from 'vitest';
      import { InMemoryProjectionSpec } from '@event-driven-io/emmett';
      import { projection } from './projection';
      import type { TodoAdded } from '../manage-todo/events';
      import { TodoSummary } from './state';

      type ProjectionEvent = TodoAdded;

      describe('Should aggregate todo counts', () => {
        let given: InMemoryProjectionSpec<ProjectionEvent>;

        beforeEach(() => {
          given = InMemoryProjectionSpec.for({ projection });
        });

        it('Todo added updates count', () =>
          given([])
            .when([
              {
                type: 'TodoAdded',
                data: {
                  todoId: 'todo_123',
                  title: 'Buy milk',
                },
                metadata: {
                  streamName: 'todos',
                  streamPosition: 1n,
                  globalPosition: 1n,
                },
              },
            ])
            .then(async (state) => {
              const document = await state.database
                .collection<TodoSummary>('TodoSummaryProjection')
                .findOne((doc) => doc.id === 'test-id');

              const expected: TodoSummary = {
                totalCount: 1,
              };

              expect(document).toMatchObject(expected);
            }));
      });
      "
    `);
  });

  it('should generate a valid test spec for composite key projection', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      narratives: [
        {
          name: 'user-project-flow',
          slices: [
            {
              type: 'command',
              name: 'manage-user-project',
              stream: 'user-project-${userId}-${projectId}',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Manage user project command',
                  rules: [
                    {
                      description: 'Should handle user project operations',
                      examples: [
                        {
                          description: 'User joins project',
                          when: {
                            commandRef: 'JoinProject',
                            exampleData: {
                              userId: 'user_123',
                              projectId: 'proj_456',
                              role: 'developer',
                            },
                          },
                          then: [
                            {
                              eventRef: 'UserJoinedProject',
                              exampleData: {
                                userId: 'user_123',
                                projectId: 'proj_456',
                                role: 'developer',
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
              name: 'view-user-projects',
              stream: 'user-projects',
              client: { description: '' },
              server: {
                description: '',
                data: [
                  {
                    target: {
                      type: 'State',
                      name: 'UserProject',
                    },
                    origin: {
                      type: 'projection',
                      name: 'UserProjectsProjection',
                      idField: ['userId', 'projectId'],
                    },
                  },
                ],
                specs: {
                  name: 'View user projects query',
                  rules: [
                    {
                      description: 'Should track user project memberships',
                      examples: [
                        {
                          description: 'User joins project',
                          when: [
                            {
                              eventRef: 'UserJoinedProject',
                              exampleData: {
                                userId: 'user_123',
                                projectId: 'proj_456',
                                role: 'developer',
                              },
                            },
                          ],
                          then: [
                            {
                              stateRef: 'UserProject',
                              exampleData: {
                                userId: 'user_123',
                                projectId: 'proj_456',
                                role: 'developer',
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
          name: 'JoinProject',
          fields: [
            { name: 'userId', type: 'string', required: true },
            { name: 'projectId', type: 'string', required: true },
            { name: 'role', type: 'string', required: true },
          ],
        },
        {
          type: 'event',
          name: 'UserJoinedProject',
          source: 'internal',
          fields: [
            { name: 'userId', type: 'string', required: true },
            { name: 'projectId', type: 'string', required: true },
            { name: 'role', type: 'string', required: true },
          ],
        },
        {
          type: 'state',
          name: 'UserProject',
          fields: [
            { name: 'userId', type: 'string', required: true },
            { name: 'projectId', type: 'string', required: true },
            { name: 'role', type: 'string', required: true },
          ],
        },
      ],
    } as SpecsSchema;

    const plans = await generateScaffoldFilePlans(spec.narratives, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('view-user-projects/projection.specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
      "import { describe, it, beforeEach, expect } from 'vitest';
      import { InMemoryProjectionSpec } from '@event-driven-io/emmett';
      import { projection } from './projection';
      import type { UserJoinedProject } from '../manage-user-project/events';
      import { UserProject } from './state';

      type ProjectionEvent = UserJoinedProject;

      describe('Should track user project memberships', () => {
        let given: InMemoryProjectionSpec<ProjectionEvent>;

        beforeEach(() => {
          given = InMemoryProjectionSpec.for({ projection });
        });

        it('User joins project', () =>
          given([])
            .when([
              {
                type: 'UserJoinedProject',
                data: {
                  userId: 'user_123',
                  projectId: 'proj_456',
                  role: 'developer',
                },
                metadata: {
                  streamName: 'user-projects',
                  streamPosition: 1n,
                  globalPosition: 1n,
                },
              },
            ])
            .then(async (state) => {
              const document = await state.database
                .collection<UserProject>('UserProjectsProjection')
                .findOne((doc) => doc.id === 'test-id');

              const expected: UserProject = {
                userId: 'user_123',
                projectId: 'proj_456',
                role: 'developer',
              };

              expect(document).toMatchObject(expected);
            }));
      });
      "
    `);
  });
});
