import {CommandSender, InMemoryEventStore} from "@event-driven-io/emmett";
import {Field, ObjectType} from "type-graphql";

export interface ReactorContext {
    eventStore: InMemoryEventStore;
    commandSender: CommandSender;
}

export interface GraphQLContext {
    eventStore: InMemoryEventStore;
}

export interface HandlerResultSuccess {
    success: true;
}

export interface HandlerResultError {
    success: false;
    error: { type: string; message: string };
}

// Union type is needed for discriminated union pattern
// eslint-disable-next-line @typescript-eslint/no-type-alias
export type HandlerResult = HandlerResultSuccess | HandlerResultError;


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