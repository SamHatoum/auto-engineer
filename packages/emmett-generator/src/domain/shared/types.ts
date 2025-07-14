import {CommandSender, InMemoryEventStore} from "@event-driven-io/emmett";
import {Field, ObjectType} from "type-graphql";

export interface ReactorContext  {
    eventStore: InMemoryEventStore;
    commandSender: CommandSender;
};

export interface GraphQLContext {
    eventStore: InMemoryEventStore;
    messageBus: CommandSender;
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