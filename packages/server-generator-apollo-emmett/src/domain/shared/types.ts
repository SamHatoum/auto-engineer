import { registerEnumType } from 'type-graphql';

import 'reflect-metadata';
import { CommandSender, EventStore, type InMemoryDatabase } from '@event-driven-io/emmett';

export interface ReactorContext {
  eventStore: EventStore;
  commandSender: CommandSender;
  database: InMemoryDatabase;
  [key: string]: unknown;
}

export interface GraphQLContext {
  eventStore: EventStore;
  messageBus: CommandSender;
  database: InMemoryDatabase;
}

export enum QuestionnaireProgressStatus {
  IN_PROGRESS = 'in_progress',
  READY_TO_SUBMIT = 'ready_to_submit',
  SUBMITTED = 'submitted',
}

registerEnumType(QuestionnaireProgressStatus, {
  name: 'QuestionnaireProgressStatus',
});
