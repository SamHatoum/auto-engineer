import { describe, it } from 'vitest';
import { DeciderSpecification } from '@event-driven-io/emmett';
import { decide } from './decide';
import { evolve } from './evolve';
import { initialState } from './state';

describe('Questionnaires | submits the questionnaire', () => {
  const given = DeciderSpecification.for({
    decide,
    evolve,
    initialState,
  });

  it('should emit QuestionnaireSubmitted for valid AnswerQuestion', () => {
    given([
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
    ])
      .when({
        type: 'AnswerQuestion',
        data: {
          questionnaireId: 'q-001',
          participantId: 'participant-abc',
        },
        metadata: { now: new Date() },
      })

      .then([
        {
          type: 'QuestionnaireSubmitted',
          data: {
            questionnaireId: 'q-001',
            participantId: 'participant-abc',
            submittedAt: new Date('2030-01-01T09:00:00.000Z'),
          },
        },
      ]);
  });
});
