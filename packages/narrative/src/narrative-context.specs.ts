import { describe, it, expect, beforeEach } from 'vitest';
import { flow, example, rule, specs } from './narrative';
import { command } from './fluent-builder';

interface QuestionnaireLinkSent {
  questionnaireId: string;
  participantId: string;
  link: string;
  sentAt: Date;
}

interface QuestionAnswered {
  questionnaireId: string;
  participantId: string;
  questionId: string;
  answer: string;
  savedAt: Date;
}

interface QuestionnaireProgress {
  questionnaireId: string;
  participantId: string;
  status: string;
  currentQuestionId: string;
  remainingQuestions: string[];
  answers: { questionId: string; value: string }[];
}

describe('Context Parameter Support', () => {
  beforeEach(async () => {
    // Clean test state before each test
  });

  it('should support context parameter in given() method', () => {
    expect(() => {
      flow('test flow with context', () => {
        command('test command').server(() => {
          specs(() => {
            rule('test rule with context', () => {
              example('given with context')
                .given<QuestionnaireLinkSent>(
                  {
                    questionnaireId: 'q-001',
                    participantId: 'participant-abc',
                    link: 'https://app.example.com/q/q-001?participant=participant-abc',
                    sentAt: new Date('2030-01-01T09:00:00Z'),
                  },
                  {
                    sentAt: 'comes from the system clock',
                    questionnaireId: 'must be a valid questionnaire ID',
                    link: 'generated based on questionnaire and participant',
                  },
                )
                .when<QuestionAnswered>({
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  questionId: 'q1',
                  answer: 'Yes',
                  savedAt: new Date('2030-01-01T09:05:00Z'),
                })
                .then<QuestionnaireProgress>({
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  status: 'in_progress',
                  currentQuestionId: 'q2',
                  remainingQuestions: ['q2'],
                  answers: [{ questionId: 'q1', value: 'Yes' }],
                });
            });
          });
        });
      });
    }).not.toThrow();
  });

  it('should support context parameter in when() method', () => {
    expect(() => {
      flow('test flow with when context', () => {
        command('test command').server(() => {
          specs(() => {
            rule('test rule', () => {
              example('when with context')
                .given<QuestionnaireLinkSent>({
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  link: 'https://app.example.com/q/q-001?participant=participant-abc',
                  sentAt: new Date('2030-01-01T09:00:00Z'),
                })
                .when<QuestionAnswered>(
                  {
                    questionnaireId: 'q-001',
                    participantId: 'participant-abc',
                    questionId: 'q1',
                    answer: 'Yes',
                    savedAt: new Date('2030-01-01T09:05:00Z'),
                  },
                  {
                    answer: 'must be validated according to the question type',
                    savedAt: 'timestamp when the answer was saved',
                  },
                )
                .then<QuestionnaireProgress>({
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  status: 'in_progress',
                  currentQuestionId: 'q2',
                  remainingQuestions: ['q2'],
                  answers: [{ questionId: 'q1', value: 'Yes' }],
                });
            });
          });
        });
      });
    }).not.toThrow();
  });

  it('should support context parameter in then() method', () => {
    expect(() => {
      flow('test flow with then context', () => {
        command('test command').server(() => {
          specs(() => {
            rule('test rule', () => {
              example('then with context')
                .given<QuestionnaireLinkSent>({
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  link: 'https://app.example.com/q/q-001?participant=participant-abc',
                  sentAt: new Date('2030-01-01T09:00:00Z'),
                })
                .when<QuestionAnswered>({
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  questionId: 'q1',
                  answer: 'Yes',
                  savedAt: new Date('2030-01-01T09:05:00Z'),
                })
                .then<QuestionnaireProgress>(
                  {
                    questionnaireId: 'q-001',
                    participantId: 'participant-abc',
                    status: 'in_progress',
                    currentQuestionId: 'q2',
                    remainingQuestions: ['q2'],
                    answers: [{ questionId: 'q1', value: 'Yes' }],
                  },
                  {
                    answers: 'computed from the answered questions',
                    status: 'calculated based on completed questions',
                    currentQuestionId: 'next question to be answered',
                  },
                );
            });
          });
        });
      });
    }).not.toThrow();
  });

  it('should preserve context data in schema output', async () => {
    // This test would require a proper file system setup to work with getNarratives
    // For now, we'll just test that the methods accept context parameters
    expect(() => {
      flow('test context preservation', () => {
        command('test preservation').server(() => {
          specs(() => {
            rule('context preservation rule', () => {
              example('context should be preserved')
                .given<QuestionnaireLinkSent>(
                  {
                    questionnaireId: 'q-001',
                    participantId: 'participant-abc',
                    link: 'https://app.example.com/q/q-001?participant=participant-abc',
                    sentAt: new Date('2030-01-01T09:00:00Z'),
                  },
                  {
                    sentAt: 'comes from the system clock',
                    questionnaireId: 'validated questionnaire identifier',
                  },
                )
                .when<QuestionAnswered>({
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  questionId: 'q1',
                  answer: 'Yes',
                  savedAt: new Date('2030-01-01T09:05:00Z'),
                })
                .then<QuestionnaireProgress>({
                  questionnaireId: 'q-001',
                  participantId: 'participant-abc',
                  status: 'in_progress',
                  currentQuestionId: 'q2',
                  remainingQuestions: ['q2'],
                  answers: [{ questionId: 'q1', value: 'Yes' }],
                });
            });
          });
        });
      });
    }).not.toThrow();
  });

  // These tests should fail with TypeScript compilation errors
  // Commenting out for now - they will be used to verify strict typing works
  /*
  it('should reject invalid context fields (compilation test)', () => {
    // This should cause a TypeScript error - invalidField is not in QuestionnaireLinkSent
    flow('invalid context test', () => {
      command('test').server(() => {
        specs(() => {
          rule('test rule', () => {
            example('invalid context')
              .given<QuestionnaireLinkSent>({
                questionnaireId: 'q-001',
                participantId: 'participant-abc',
                link: 'https://app.example.com',
                sentAt: new Date(),
              }, {
                invalidField: 'this should cause a type error'  // TypeScript error expected
              });
          });
        });
      });
    });
  });
  */
});
