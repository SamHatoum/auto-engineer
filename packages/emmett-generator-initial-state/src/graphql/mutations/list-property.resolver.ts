import {Arg, Ctx, Field, InputType, Mutation, ObjectType, Resolver} from 'type-graphql';
import {CommandHandler} from '@event-driven-io/emmett';
import {GraphQLContext} from "../context";
import {evolve} from "../../domain/slices/list-property/evolve";
import {initialPropertyState} from "../../domain/slices/list-property/state";
import {handle} from "../../domain/slices/list-property/handle";


@InputType()
class ListPropertyInput {
    @Field(() => String) propertyId!: string;
    @Field(() => String) hostId!: string;
    @Field(() => String) location!: string;
    @Field(() => String) address!: string;
    @Field(() => String) title!: string;
    @Field(() => String) description!: string;
    @Field(() => Number) pricePerNight!: number;
    @Field(() => Number) maxGuests!: number;
    @Field(() => [String]) amenities!: string[];
}

@ObjectType()
class ListPropertyResponse {
    @Field(() => Boolean) success!: boolean;
}

@Resolver()
export class ListPropertyResolver {
    private handler = CommandHandler({
        evolve: evolve,
        initialState: initialPropertyState,
    });

    @Mutation(() => ListPropertyResponse)
    async listProperty(
        @Arg('input', () => ListPropertyInput) input: ListPropertyInput,
        @Ctx() ctx: GraphQLContext
    ): Promise<ListPropertyResponse> {
        await handle(ctx.eventStore, {type: 'ListProperty', data: input});
        return {success: true};
    }
}