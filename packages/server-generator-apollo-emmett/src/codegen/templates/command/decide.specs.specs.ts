import { describe, it, expect } from 'vitest';
import { Model as SpecsSchema } from '@auto-engineer/flow';
import { generateScaffoldFilePlans } from '../../scaffoldFromSchema';

describe('spec.ts.ejs', () => {
  it('should generate a valid spec file', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Host creates a listing',
          slices: [
            {
              type: 'command',
              name: 'Create listing',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Create listing spec',
                  rules: [
                    {
                      description: 'Should create listing successfully',
                      examples: [
                        {
                          description: 'User creates listing with valid data',
                          when: {
                            commandRef: 'CreateListing',
                            exampleData: {
                              propertyId: 'listing_123',
                              title: 'blah',
                              pricePerNight: 250,
                              maxGuests: 4,
                              amenities: ['wifi', 'kitchen'],
                              available: true,
                              tags: ['some tag'],
                              rating: 4.8,
                              metadata: { foo: 'bar' },
                              listedAt: '2024-01-15T10:00:00Z',
                            },
                          },
                          then: [
                            {
                              eventRef: 'ListingCreated',
                              exampleData: {
                                propertyId: 'listing_123',
                                listedAt: '2024-01-15T10:00:00Z',
                                rating: 4.8,
                                metadata: { foo: 'bar' },
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
            { name: 'maxGuests', type: 'number', required: true },
            { name: 'amenities', type: 'string[]', required: true },
            { name: 'available', type: 'boolean', required: true },
            { name: 'tags', type: 'string[]', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'metadata', type: 'object', required: true },
            { name: 'listedAt', type: 'Date', required: true },
          ],
        },
        {
          type: 'event',
          name: 'ListingCreated',
          source: 'internal',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'listedAt', type: 'Date', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'metadata', type: 'object', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
          "import { describe, it } from 'vitest';
          import { DeciderSpecification } from '@event-driven-io/emmett';
          import { decide } from './decide';
          import { evolve } from './evolve';
          import { initialState, State } from './state';
          import type { ListingCreated } from './events';
          import type { CreateListing } from './commands';

          describe('Should create listing successfully', () => {
            type Events = ListingCreated;

            const given = DeciderSpecification.for<CreateListing, Events, State>({
              decide,
              evolve,
              initialState,
            });

            it('User creates listing with valid data', () => {
              given([])
                .when({
                  type: 'CreateListing',
                  data: {
                    propertyId: 'listing_123',
                    title: 'blah',
                    pricePerNight: 250,
                    maxGuests: 4,
                    amenities: ['wifi', 'kitchen'],
                    available: true,
                    tags: ['some tag'],
                    rating: 4.8,
                    metadata: { foo: 'bar' },
                    listedAt: new Date('2024-01-15T10:00:00Z'),
                  },
                  metadata: { now: new Date() },
                })

                .then([
                  {
                    type: 'ListingCreated',
                    data: {
                      propertyId: 'listing_123',
                      listedAt: new Date('2024-01-15T10:00:00Z'),
                      rating: 4.8,
                      metadata: { foo: 'bar' },
                    },
                  },
                ]);
            });
          });
          "
        `);
  });
  it('should include given events in the spec file when provided', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Guest removes a listing',
          slices: [
            {
              type: 'command',
              name: 'Remove listing',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Remove listing spec',
                  rules: [
                    {
                      description: 'Should remove existing listing',
                      examples: [
                        {
                          description: 'Existing listing can be removed',
                          given: [
                            {
                              eventRef: 'ListingCreated',
                              exampleData: {
                                propertyId: 'listing_123',
                                listedAt: '2024-01-15T10:00:00Z',
                                rating: 4.8,
                                metadata: { foo: 'bar' },
                              },
                            },
                          ],
                          when: {
                            commandRef: 'RemoveListing',
                            exampleData: {
                              propertyId: 'listing_123',
                            },
                          },
                          then: [
                            {
                              eventRef: 'ListingRemoved',
                              exampleData: {
                                propertyId: 'listing_123',
                                removedAt: '2024-01-16T10:00:00Z',
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
          name: 'RemoveListing',
          fields: [{ name: 'propertyId', type: 'string', required: true }],
        },
        {
          type: 'event',
          name: 'ListingCreated',
          source: 'internal',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'listedAt', type: 'Date', required: true },
            { name: 'rating', type: 'number', required: true },
            { name: 'metadata', type: 'object', required: true },
          ],
        },
        {
          type: 'event',
          name: 'ListingRemoved',
          source: 'internal',
          fields: [
            { name: 'propertyId', type: 'string', required: true },
            { name: 'removedAt', type: 'Date', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
      "import { describe, it } from 'vitest';
      import { DeciderSpecification } from '@event-driven-io/emmett';
      import { decide } from './decide';
      import { evolve } from './evolve';
      import { initialState, State } from './state';
      import type { ListingCreated, ListingRemoved } from './events';
      import type { RemoveListing } from './commands';

      describe('Should remove existing listing', () => {
        type Events = ListingCreated | ListingRemoved;

        const given = DeciderSpecification.for<RemoveListing, Events, State>({
          decide,
          evolve,
          initialState,
        });

        it('Existing listing can be removed', () => {
          given([
            {
              type: 'ListingCreated',
              data: {
                propertyId: 'listing_123',
                listedAt: new Date('2024-01-15T10:00:00Z'),
                rating: 4.8,
                metadata: { foo: 'bar' },
              },
            },
          ])
            .when({
              type: 'RemoveListing',
              data: {
                propertyId: 'listing_123',
              },
              metadata: { now: new Date() },
            })

            .then([
              {
                type: 'ListingRemoved',
                data: {
                  propertyId: 'listing_123',
                  removedAt: new Date('2024-01-16T10:00:00Z'),
                },
              },
            ]);
        });
      });
      "
    `);
  });

  it('should generate separate tests for multiple examples with different scenarios', async () => {
    const spec: SpecsSchema = {
      variant: 'specs',
      flows: [
        {
          name: 'Questionnaires',
          slices: [
            {
              type: 'command',
              name: 'submits a questionnaire answer',
              client: { description: '' },
              server: {
                description: '',
                specs: {
                  name: 'Answer question spec',
                  rules: [
                    {
                      description: 'answers are allowed while the questionnaire has not been submitted',
                      examples: [
                        {
                          description: 'no questions have been answered yet',
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
                        },
                        {
                          description: 'all questions have already been answered and submitted',
                          given: [
                            {
                              eventRef: 'QuestionnaireSubmitted',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                submittedAt: '2030-01-01T09:00:00.000Z',
                              },
                            },
                          ],
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
                              eventRef: 'QuestionnaireEditRejected',
                              exampleData: {
                                questionnaireId: 'q-001',
                                participantId: 'participant-abc',
                                reason: 'Questionnaire already submitted',
                                attemptedAt: '2030-01-01T09:05:00.000Z',
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
          name: 'AnswerQuestion',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
          ],
        },
        {
          type: 'event',
          name: 'QuestionAnswered',
          source: 'internal',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'questionId', type: 'string', required: true },
            { name: 'answer', type: 'unknown', required: true },
            { name: 'savedAt', type: 'Date', required: true },
          ],
        },
        {
          type: 'event',
          name: 'QuestionnaireSubmitted',
          source: 'internal',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'submittedAt', type: 'Date', required: true },
          ],
        },
        {
          type: 'event',
          name: 'QuestionnaireEditRejected',
          source: 'internal',
          fields: [
            { name: 'questionnaireId', type: 'string', required: true },
            { name: 'participantId', type: 'string', required: true },
            { name: 'reason', type: 'string', required: true },
            { name: 'attemptedAt', type: 'Date', required: true },
          ],
        },
      ],
    };

    const plans = await generateScaffoldFilePlans(spec.flows, spec.messages, undefined, 'src/domain/flows');
    const specFile = plans.find((p) => p.outputPath.endsWith('specs.ts'));

    expect(specFile?.contents).toMatchInlineSnapshot(`
      "import { describe, it } from 'vitest';
      import { DeciderSpecification } from '@event-driven-io/emmett';
      import { decide } from './decide';
      import { evolve } from './evolve';
      import { initialState, State } from './state';
      import type { QuestionAnswered, QuestionnaireEditRejected, QuestionnaireSubmitted } from './events';
      import type { AnswerQuestion } from './commands';

      describe('answers are allowed while the questionnaire has not been submitted', () => {
        type Events = QuestionAnswered | QuestionnaireEditRejected | QuestionnaireSubmitted;

        const given = DeciderSpecification.for<AnswerQuestion, Events, State>({
          decide,
          evolve,
          initialState,
        });

        it('no questions have been answered yet', () => {
          given([])
            .when({
              type: 'AnswerQuestion',
              data: {
                questionnaireId: 'q-001',
                participantId: 'participant-abc',
                questionId: 'q1',
                answer: 'Yes',
              },
              metadata: { now: new Date() },
            })

            .then([
              {
                type: 'QuestionAnswered',
                data: {
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  questionId: 'q1',
                  answer: 'Yes',
                  savedAt: new Date('2030-01-01T09:05:00.000Z'),
                },
              },
            ]);
        });

        it('all questions have already been answered and submitted', () => {
          given([
            {
              type: 'QuestionnaireSubmitted',
              data: {
                questionnaireId: 'q-001',
                participantId: 'participant-abc',
                submittedAt: new Date('2030-01-01T09:00:00.000Z'),
              },
            },
          ])
            .when({
              type: 'AnswerQuestion',
              data: {
                questionnaireId: 'q-001',
                participantId: 'participant-abc',
                questionId: 'q1',
                answer: 'Yes',
              },
              metadata: { now: new Date() },
            })

            .then([
              {
                type: 'QuestionnaireEditRejected',
                data: {
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  reason: 'Questionnaire already submitted',
                  attemptedAt: new Date('2030-01-01T09:05:00.000Z'),
                },
              },
            ]);
        });
      });
      "
    `);
  });
});
