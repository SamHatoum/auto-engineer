import { graphql } from '../gql';

export const QuestionnaireProgress = graphql(`
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
`);
