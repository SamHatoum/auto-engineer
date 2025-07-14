import {CommandSender, InMemoryEventStore} from "@event-driven-io/emmett";
import {Field, ObjectType} from "type-graphql";

export type ReactorContext = {
    eventStore: InMemoryEventStore;
    commandSender: CommandSender;
};

export interface GraphQLContext {
    eventStore: InMemoryEventStore;
    messageBus: CommandSender;
}

export type HandlerResult =
    | { success: true }
    | { success: false; error: { type: string; message: string } };


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