import { Mutation, Resolver, Arg, Ctx } from 'type-graphql';
import { handle } from './handle';
import { GraphQLContext, MutationResponse, toMutationResponse } from '../../../shared';
import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateListingInput {
    @Field(() => String)
    propertyId!: string;

    @Field(() => String)
    hostId!: string;

    @Field(() => String)
    location!: string;

    @Field(() => String)
    address!: string;

    @Field(() => String)
    title!: string;

    @Field(() => String)
    description!: string;

    @Field(() => Number)
    pricePerNight!: number;

    @Field(() => Number)
    maxGuests!: number;

    @Field(() => [String])
    amenities!: string[];
}


@Resolver()
export class CreateListingResolver {
    @Mutation(() => MutationResponse)
    async createListing(
        @Arg('input', () => CreateListingInput) input: CreateListingInput,
        @Ctx() ctx: GraphQLContext
    ): Promise<MutationResponse> {
        const result = await handle(ctx.eventStore, {
            type: 'CreateListing',
            data: input,
        });
        return toMutationResponse(result);
    }
}