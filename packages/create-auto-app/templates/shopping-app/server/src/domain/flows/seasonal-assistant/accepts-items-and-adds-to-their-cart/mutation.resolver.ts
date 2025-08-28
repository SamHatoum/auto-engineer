import { Mutation, Resolver, Arg, Ctx, Field, InputType } from 'type-graphql';
import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

@InputType()
export class AddItemsToCartInput {
  @Field(() => String)
  sessionId!: string;
  @Field(() => String)
  items!: Array<{ productId: string; quantity: number }>;
}

@Resolver()
export class AddItemsToCartResolver {
  @Mutation(() => MutationResponse)
  async addItemsToCart(
    @Arg('input', () => AddItemsToCartInput) input: AddItemsToCartInput,
    @Ctx() ctx: GraphQLContext,
  ): Promise<MutationResponse> {
    return await sendCommand(ctx.messageBus, {
      type: 'AddItemsToCart',
      kind: 'Command',
      data: { ...input },
    });
  }
}
