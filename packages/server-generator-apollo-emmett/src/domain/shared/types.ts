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
