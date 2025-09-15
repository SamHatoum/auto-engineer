import type { Event } from '@event-driven-io/emmett';

export type QuestionnaireSubmitted = Event<
  'QuestionnaireSubmitted',
  {
    questionnaireId: string;
    participantId: string;
    submittedAt: Date;
  }
>;
