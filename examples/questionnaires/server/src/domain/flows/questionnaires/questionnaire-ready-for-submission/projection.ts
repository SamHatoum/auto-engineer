import {
  inMemorySingleStreamProjection,
  type ReadEvent,
  type InMemoryReadEventMetadata,
} from '@event-driven-io/emmett';
import type { QuestionnaireProgress } from './state';
type AllEvents = never;

export const projection = inMemorySingleStreamProjection<QuestionnaireProgress, AllEvents>({
  collectionName: 'Questionnaires',
  canHandle: [],
  getDocumentId: (event) => event.data.questionnaire - participantId,
  evolve: (
    document: QuestionnaireProgress | null,
    event: ReadEvent<AllEvents, InMemoryReadEventMetadata>,
  ): QuestionnaireProgress | null => {
    switch (event.type) {
      default:
        return document;
    }
  },
});

export default projection;
