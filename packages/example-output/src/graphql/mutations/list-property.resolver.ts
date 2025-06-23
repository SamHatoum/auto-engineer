import {Arg, Ctx, Field, InputType, Mutation, ObjectType, Resolver} from 'type-graphql';
import {CommandHandler} from '@event-driven-io/emmett';
import {GraphQLContext} from "../context";
import {evolve} from "../../domain/slices/create-listing/evolve";
import {initialListingState} from "../../domain/slices/create-listing/state";
import {handle} from "../../domain/slices/create-listing/handle";


@InputType()
class CreateListingInput {
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
class CreateListingResponse {
    @Field(() => Boolean) success!: boolean;
}

@Resolver()
export class CreateListingResolver {
    private handler = CommandHandler({
        evolve: evolve,
        initialState: initialListingState,
    });

    @Mutation(() => CreateListingResponse)
    async createListing(
        @Arg('input', () => CreateListingInput) input: CreateListingInput,
        @Ctx() ctx: GraphQLContext
    ): Promise<CreateListingResponse> {
        await handle(ctx.eventStore, {type: 'CreateListing', data: input});
        return {success: true};
    }
}