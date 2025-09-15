import { Command } from '@event-driven-io/emmett';
export type AnswerQuestion = Command<
  'AnswerQuestion',
  {
    questionnaireId: string;
    participantId: string;
    questionId: string;
    answer: unknown;
  }
>;
