import { Mutation, Resolver, Arg, Ctx } from 'type-graphql';
import { GraphQLContext, MutationResponse } from '../../../shared';
import { Field, InputType } from 'type-graphql';
import { sendCommand } from '../../../shared';

@InputType()
export class CreateListingInput {
  @Field(() => String)
  listingId!: string;

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
    @Ctx() ctx: GraphQLContext,
  ): Promise<MutationResponse> {
    return await sendCommand(ctx.messageBus, {
      type: 'CreateListing',
      kind: 'Command',
      data: { ...input },
    });
  }
}
