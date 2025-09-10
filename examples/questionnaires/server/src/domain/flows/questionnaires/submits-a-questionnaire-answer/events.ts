import type { Event } from '@event-driven-io/emmett';

export type QuestionAnswered = Event<
  'QuestionAnswered',
  {
    questionnaireId: string;
    participantId: string;
    questionId: string;
    answer: unknown;
    savedAt: Date;
  }
>;
export type QuestionnaireLinkSent = Event<
  'QuestionnaireLinkSent',
  {
    questionnaireId: string;
    participantId: string;
    link: string;
    sentAt: Date;
  }
>;
export type QuestionnaireEditRejected = Event<
  'QuestionnaireEditRejected',
  {
    questionnaireId: string;
    participantId: string;
    reason: string;
    attemptedAt: Date;
  }
>;
