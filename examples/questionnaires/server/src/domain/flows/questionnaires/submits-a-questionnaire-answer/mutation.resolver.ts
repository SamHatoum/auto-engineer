import { Mutation, Resolver, Arg, Ctx, Field, InputType } from 'type-graphql';
import { type GraphQLContext, sendCommand, MutationResponse } from '../../../shared';

@InputType()
export class AnswerQuestionInput {
  @Field(() => String)
  questionnaireId!: string;
  @Field(() => String)
  participantId!: string;
  @Field(() => String)
  questionId!: string;
  @Field(() => String)
  answer!: unknown;
}

@Resolver()
export class AnswerQuestionResolver {
  @Mutation(() => MutationResponse)
  async answerQuestion(
    @Arg('input', () => AnswerQuestionInput) input: AnswerQuestionInput,
    @Ctx() ctx: GraphQLContext,
  ): Promise<MutationResponse> {
    return await sendCommand(ctx.messageBus, {
      type: 'AnswerQuestion',
      kind: 'Command',
      data: { ...input },
    });
  }
}
