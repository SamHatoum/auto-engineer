import { describe, it, beforeEach, expect } from 'vitest';
import { InMemoryProjectionSpec } from '@event-driven-io/emmett';
import { projection } from './projection';
import type {} from '../unknown/events';
import { QuestionnaireProgress } from './state';

type ProjectionEvent = never;

describe('Questionnaires Projection', () => {
  let given: InMemoryProjectionSpec<ProjectionEvent>;

  beforeEach(() => {
    given = InMemoryProjectionSpec.for({ projection });
  });

  it('creates or updates QuestionnaireProgress document - case 1', () =>
    given([])
      .when([])
      .then(async (state) => {
        const document = await state.database
          .collection<QuestionnaireProgress>('Questionnaires')
          .findOne((doc) => doc.questionnaire - participantId === 'unknown-id');

        const expected: QuestionnaireProgress = {
          questionnaireId: 'q-001',
          participantId: 'participant-abc',
          status: 'ready_to_submit',
          currentQuestionId: null,
          remainingQuestions: [],
          answers: [
            { questionId: 'q1', value: 'Yes' },
            { questionId: 'q2', value: 'No' },
          ],
        };

        expect(document).toMatchObject(expected);
      }));
  it('creates or updates QuestionnaireProgress document - case 2', () =>
    given([])
      .when([])
      .then(async (state) => {
        const document = await state.database
          .collection<QuestionnaireProgress>('Questionnaires')
          .findOne((doc) => doc.questionnaire - participantId === 'unknown-id');

        const expected: QuestionnaireProgress = {
          questionnaireId: 'q-001',
          participantId: 'participant-abc',
          status: 'in_progress',
          currentQuestionId: 'q2',
          remainingQuestions: ['q2', 'q3'],
          answers: [{ questionId: 'q1', value: 'Yes' }],
        };

        expect(document).toMatchObject(expected);
      }));
});
