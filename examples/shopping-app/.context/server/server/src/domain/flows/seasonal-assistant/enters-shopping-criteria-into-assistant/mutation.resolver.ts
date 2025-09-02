import { Mutation, Resolver, Arg, Ctx, Field, InputType } from 'type-graphql';
import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

@InputType()
export class EnterShoppingCriteriaInput {
  @Field(() => String)
  sessionId!: string;
  @Field(() => String)
  criteria!: string;
}

@Resolver()
export class EnterShoppingCriteriaResolver {
  @Mutation(() => MutationResponse)
  async enterShoppingCriteria(
    @Arg('input', () => EnterShoppingCriteriaInput) input: EnterShoppingCriteriaInput,
    @Ctx() ctx: GraphQLContext,
  ): Promise<MutationResponse> {
    return await sendCommand(ctx.messageBus, {
      type: 'EnterShoppingCriteria',
      kind: 'Command',
      data: { ...input },
    });
  }
}
