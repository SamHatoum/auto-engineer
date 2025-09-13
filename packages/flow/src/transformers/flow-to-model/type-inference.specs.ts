import { describe, it, expect } from 'vitest';
import { flowsToModel } from './index';
import type { Flow } from '../../index';

describe('Type inference in flow-to-model transformer', () => {
  it('should correctly extract command types from when clauses', () => {
    const flows: Flow[] = [
      {
        name: 'Test Flow',
        id: 'FLOW-001',
        slices: [
          {
            id: 'SLICE-001',
            type: 'command',
            name: 'Submit Answer Command',
            client: { description: 'Submit answer client' },
            server: {
              description: 'Submit answer server',
              specs: {
                name: 'Submit Answer Specs',
                rules: [
                  {
                    id: 'RULE-001',
                    description: 'Should accept answer submission',
                    examples: [
                      {
                        description: 'Valid answer submission',
                        when: [
                          {
                            commandRef: 'AnswerQuestion',
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                              questionId: 'q1',
                              answer: 'Yes',
                            },
                          },
                        ],
                        then: [
                          {
                            eventRef: 'QuestionAnswered',
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                              questionId: 'q1',
                              answer: 'Yes',
                              savedAt: new Date(),
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
            id: 'SLICE-002',
            type: 'command',
            name: 'Submit Questionnaire Command',
            client: { description: 'Submit questionnaire client' },
            server: {
              description: 'Submit questionnaire server',
              specs: {
                name: 'Submit Questionnaire Specs',
                rules: [
                  {
                    id: 'RULE-002',
                    description: 'Should submit questionnaire',
                    examples: [
                      {
                        description: 'Valid questionnaire submission',
                        when: [
                          {
                            commandRef: 'SubmitQuestionnaire',
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                            },
                          },
                        ],
                        then: [
                          {
                            eventRef: 'QuestionnaireSubmitted',
                            exampleData: {
                              questionnaireId: 'q-001',
                              participantId: 'participant-abc',
                              submittedAt: new Date(),
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
    ];

    const model = flowsToModel(flows);

    // Should have the correct command messages extracted
    expect(model.messages.some((msg) => msg.name === 'AnswerQuestion')).toBe(true);
    expect(model.messages.some((msg) => msg.name === 'SubmitQuestionnaire')).toBe(true);
    expect(model.messages.some((msg) => msg.name === 'QuestionAnswered')).toBe(true);
    expect(model.messages.some((msg) => msg.name === 'QuestionnaireSubmitted')).toBe(true);

    // Should NOT have InferredType fallback
    expect(model.messages.some((msg) => msg.name === 'InferredType')).toBe(false);

    // Verify the command messages have the correct structure
    const answerQuestionMsg = model.messages.find((msg) => msg.name === 'AnswerQuestion');
    expect(answerQuestionMsg?.type).toBe('command');
    expect(answerQuestionMsg?.fields).toBeDefined();

    const submitQuestionnaireMsg = model.messages.find((msg) => msg.name === 'SubmitQuestionnaire');
    expect(submitQuestionnaireMsg?.type).toBe('command');
    expect(submitQuestionnaireMsg?.fields).toBeDefined();
  });

  it('should handle single object when/then clauses correctly', () => {
    const flows: Flow[] = [
      {
        name: 'Single Object Flow',
        id: 'FLOW-001',
        slices: [
          {
            id: 'SLICE-001',
            type: 'command',
            name: 'Single Object Command',
            client: { description: 'Single object client' },
            server: {
              description: 'Single object server',
              specs: {
                name: 'Single Object Specs',
                rules: [
                  {
                    id: 'RULE-001',
                    description: 'Should handle single object',
                    examples: [
                      {
                        description: 'Single object example',
                        // Single object, not array - this is what broke
                        when: {
                          commandRef: 'TestCommand',
                          exampleData: { test: 'value' },
                        },
                        then: [
                          {
                            eventRef: 'TestEvent',
                            exampleData: { result: 'success' },
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
    ];

    const model = flowsToModel(flows);

    // Should extract the command and event types from single objects
    expect(model.messages.some((msg) => msg.name === 'TestCommand')).toBe(true);
    expect(model.messages.some((msg) => msg.name === 'TestEvent')).toBe(true);
    expect(model.messages.some((msg) => msg.name === 'InferredType')).toBe(false);
  });
});
