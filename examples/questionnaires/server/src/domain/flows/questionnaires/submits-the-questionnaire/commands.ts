import { Command } from '@event-driven-io/emmett';
export type SubmitQuestionnaire = Command<
  'SubmitQuestionnaire',
  {
    questionnaireId: string;
    participantId: string;
  }
>;
