import { Query, Resolver, Arg, Ctx, ObjectType, Field, ID } from 'type-graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { type GraphQLContext, ReadModel } from '../../../shared';

@ObjectType()
export class QuestionnaireProgressAnswers {
  @Field(() => String)
  questionId!: string;

  @Field(() => GraphQLJSON)
  value!: unknown;
}

@ObjectType()
export class QuestionnaireProgress {
  @Field(() => String)
  questionnaireId!: string;

  @Field(() => String)
  participantId!: string;

  @Field(() => String)
  status!: 'in_progress' | 'ready_to_submit' | 'submitted';

  @Field(() => String, { nullable: true })
  currentQuestionId?: string | null;

  @Field(() => [String])
  remainingQuestions!: string[];

  @Field(() => [QuestionnaireProgressAnswers])
  answers!: QuestionnaireProgressAnswers[];

  [key: string]: unknown;
}

@Resolver()
export class QuestionnaireReadyForSubmissionQueryResolver {
  @Query(() => [QuestionnaireProgress])
  async questionnaireProgress(
    @Ctx() ctx: GraphQLContext,
    @Arg('participantId', () => ID, { nullable: true }) participantId?: string,
  ): Promise<QuestionnaireProgress[]> {
    const model = new ReadModel<QuestionnaireProgress>(ctx.eventStore, 'Questionnaires');

    // ## IMPLEMENTATION INSTRUCTIONS ##
    // You can query the projection using the ReadModel API:
    // - model.getAll() — fetch all documents
    // - model.getById(id) — fetch a single document by ID (default key: 'id')
    // - model.find(filterFn) — filter documents using a predicate
    // - model.first(filterFn) — fetch the first document matching a predicate
    //
    // Example below uses \`.find()\` to filter
    // change the logic for the query as needed to meet the requirements for the current slice.

    return model.find((item) => {
      if (participantId !== undefined && item.participantId !== participantId) return false;

      return true;
    });
  }
}
