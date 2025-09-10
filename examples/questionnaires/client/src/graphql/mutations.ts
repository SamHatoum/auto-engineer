import { graphql } from '../gql';

export const AnswerQuestion = graphql(`
  mutation AnswerQuestion($input: AnswerQuestionInput!) {
    answerQuestion(input: $input) {
      success
    }
  }
`);

export const SubmitQuestionnaire = graphql(`
  mutation SubmitQuestionnaire($input: SubmitQuestionnaireInput!) {
    submitQuestionnaire(input: $input) {
      success
    }
  }
`);
