import { CommandSender, EventStore, type InMemoryDatabase } from '@event-driven-io/emmett';
import { Field, ObjectType, registerEnumType } from 'type-graphql';
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

@ObjectType()
export class MutationError {
  @Field(() => String)
  type!: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
export class MutationResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => MutationError, { nullable: true })
  error?: MutationError;
}

export enum Status {
  IN_PROGRESS = 'in_progress',
  READY_TO_SUBMIT = 'ready_to_submit',
  SUBMITTED = 'submitted',
}

registerEnumType(Status, {
  name: 'Status',
});
