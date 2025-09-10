import { describe, it } from 'vitest';
import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialState } from './state';

describe('Questionnaires | submits a questionnaire answer', () => {
  const given = DeciderSpecification.for({
    decide,
    evolve,
    initialState,
  });

  it('should emit QuestionAnswered, QuestionnaireEditRejected for valid AnswerQuestion', () => {
    given([
      {
        type: 'QuestionnaireLinkSent',
        data: {
          questionnaireId: 'q-001',
          participantId: 'participant-abc',
          submittedAt: '2030-01-01T09:00:00.000Z',
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
          type: 'QuestionAnswered',
          data: {
            questionnaireId: 'q-001',
            participantId: 'participant-abc',
            questionId: 'q1',
            answer: 'Yes',
            savedAt: new Date('2030-01-01T09:05:00.000Z'),
          },
        },
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
