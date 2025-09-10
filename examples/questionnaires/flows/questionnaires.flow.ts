import {
  commandSlice,
  querySlice,
  flow,
  should,
  specs,
  gql,
  source,
  data,
  sink,
  type Command,
  type Event,
  type State,
  rule,
  example,
} from '@auto-engineer/flow';

type QuestionnaireLinkSent = Event<
  'QuestionnaireLinkSent',
  {
    questionnaireId: string;
    participantId: string;
    link: string;
    sentAt: Date;
  }
>;

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

type QuestionnaireSubmitted = Event<
  'QuestionnaireSubmitted',
  {
    questionnaireId: string;
    participantId: string;
    submittedAt: Date;
  }
>;

type QuestionnaireEditRejected = Event<
  'QuestionnaireEditRejected',
  {
    questionnaireId: string;
    participantId: string;
    reason: string;
    attemptedAt: Date;
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

type SubmitQuestionnaire = Command<
  'SubmitQuestionnaire',
  {
    questionnaireId: string;
    participantId: string;
  }
>;

type QuestionnaireConfig = State<
  'QuestionnaireConfig',
  {
    questionnaireId: string;
    numberOfQuestions: number;
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

flow('Questionnaires', () => {
  querySlice('views the questionnaire')
    .server(() => {
      specs(() => {
        rule('questionnaires show current progress', () => {
          example('a question has already been answered')
            .given<QuestionnaireLinkSent>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              link: 'https://app.example.com/q/q-001?participant=participant-abc',
              sentAt: new Date('2030-01-01T09:00:00Z'),
            })
            .and<QuestionAnswered>({
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
      data([source().state('QuestionnaireProgress').fromProjection('Questionnaires', 'questionnaire-participantId')]);
    })
    .request(gql`
      query QuestionnaireProgress($participantId: ID!) {
        questionnaireProgress(participantId: $participantId) {
          questionnaireId
          participantId
          status
          currentQuestionId
          remainingQuestions
          answers {
            questionId
            value
          }
        }
      }
    `)
    .client(() => {
      specs(() => {
        should('focus on the current question based on the progress state');
        should('display the list of answered questions');
        should('display the list of remaining questions');
        should('show a progress indicator that is always visible as the user scrolls');
      });
    });

  commandSlice('submits a questionnaire answer')
    .server(() => {
      specs(() => {
        rule('answers are allowed while the questionnaire has not been submitted', () => {
          example('no questions have been answered yet')
            .when<AnswerQuestion>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'q1',
              answer: 'Yes',
            })
            .then<QuestionAnswered>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'q1',
              answer: 'Yes',
              savedAt: new Date('2030-01-01T09:05:00Z'),
            });
          example('all questions have already been answered and submitted')
            .given<QuestionnaireSubmitted>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              submittedAt: new Date('2030-01-01T09:00:00Z'),
            })
            .when<AnswerQuestion>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'q1',
              answer: 'Yes',
            })
            .then<QuestionnaireEditRejected>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              reason: 'Questionnaire already submitted',
              attemptedAt: new Date('2030-01-01T09:05:00Z'),
            });
        });
      });
      data([
        sink().event('QuestionAnswered').toStream('questionnaire-participantId'),
        sink().event('QuestionnaireEditRejected').toStream('questionnaire-participantId'),
      ]);
    })
    .request(gql`
      mutation AnswerQuestion($input: AnswerQuestionInput!) {
        answerQuestion(input: $input) {
          success
        }
      }
    `)
    .client(() => {
      specs(() => {
        should('display a success message when the answer is submitted');
        should('display an error message when the answer submission is rejected');
      });
    });

  querySlice('questionnaire ready for submission')
    .server(() => {
      specs(() => {
        rule('questionnaire is ready for submission when all questions are answered', () => {
          example('all questions have been answered')
            .given<QuestionnaireConfig>({
              questionnaireId: 'q-001',
              numberOfQuestions: 2,
            })
            .and<QuestionnaireLinkSent>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              link: 'https://app.example.com/q/q-001?participant=participant-abc',
              sentAt: new Date('2030-01-01T09:00:00Z'),
            })
            .and<QuestionAnswered>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'q1',
              answer: 'Yes',
              savedAt: new Date('2030-01-01T09:05:00Z'),
            })
            .and<QuestionAnswered>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'q2',
              answer: 'No',
              savedAt: new Date('2030-01-01T09:05:00Z'),
            })
            .when({}) // FIX ME
            .then<QuestionnaireProgress>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              status: 'ready_to_submit',
              currentQuestionId: null,
              remainingQuestions: [],
              answers: [
                { questionId: 'q1', value: 'Yes' },
                { questionId: 'q2', value: 'No' },
              ],
            });
          example('some questions are still unanswered')
            .given<QuestionnaireLinkSent>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              link: 'https://app.example.com/q/q-001?participant=participant-abc',
              sentAt: new Date('2030-01-01T09:00:00Z'),
            })
            .and<QuestionAnswered>({
              questionnaireId: 'q-001',
              participantId: 'participant-abc',
              questionId: 'q1',
              answer: 'Yes',
              savedAt: new Date('2030-01-01T09:05:00Z'),
            })
            .when({}) // FIX ME
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
      data([
        source().state('QuestionnaireProgress').fromProjection('Questionnaires', 'questionnaire-participantId'),
        source().state('QuestionnaireConfig').fromDatabase('QuestionnaireConfigAPI'),
      ]);
    })
    .request(gql`
      query QuestionnaireProgress($participantId: ID!) {
        questionnaireProgress(participantId: $participantId) {
          questionnaireId
          participantId
          status
          currentQuestionId
          remainingQuestions
          answers {
            questionId
            value
          }
        }
      }
    `)
    .client(() => {
      specs(() => {
        should('enable the submit button when all questions are answered');
        should('disable the submit button when all questions have not been answered');
      });
    });

  commandSlice('submits the questionnaire')
    .server(() => {
      specs(() => {
        rule('questionnaire allowed to be submitted when all questions are answered', () => {
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
    .request(gql`
      mutation SubmitQuestionnaire($input: SubmitQuestionnaireInput!) {
        submitQuestionnaire(input: $input) {
          success
        }
      }
    `)
    .client(() => {
      specs(() => {
        should('display a confirmation message upon successful submission');
      });
    });
});

// notifications are updated
// they are taken back home
// homepage status shows "Pre-Registration Complete"
