import { Mutation, Resolver, Arg, Ctx, Field, InputType } from 'type-graphql';
import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

@InputType()
export class SubmitQuestionnaireInput {
  @Field(() => String)
  questionnaireId!: string;

  @Field(() => String)
  participantId!: string;
}

@Resolver()
export class SubmitQuestionnaireResolver {
  @Mutation(() => MutationResponse)
  async submitQuestionnaire(
    @Arg('input', () => SubmitQuestionnaireInput) input: SubmitQuestionnaireInput,
    @Ctx() ctx: GraphQLContext,
  ): Promise<MutationResponse> {
    return await sendCommand(ctx.messageBus, {
      type: 'SubmitQuestionnaire',
      kind: 'Command',
      data: { ...input },
    });
  }
}
