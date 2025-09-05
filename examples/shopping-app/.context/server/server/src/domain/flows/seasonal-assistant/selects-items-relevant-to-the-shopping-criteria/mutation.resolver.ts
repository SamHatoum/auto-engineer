import { Mutation, Resolver, Arg, Ctx, Field, InputType } from 'type-graphql';
import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

@InputType()
export class SuggestShoppingItemsInput {
  @Field(() => String)
  sessionId!: string;
  @Field(() => String)
  prompt!: string;
}

@Resolver()
export class SuggestShoppingItemsResolver {
  @Mutation(() => MutationResponse)
  async suggestShoppingItems(
    @Arg('input', () => SuggestShoppingItemsInput) input: SuggestShoppingItemsInput,
    @Ctx() ctx: GraphQLContext,
  ): Promise<MutationResponse> {
    return await sendCommand(ctx.messageBus, {
      type: 'SuggestShoppingItems',
      kind: 'Command',
      data: { ...input },
    });
  }
}
