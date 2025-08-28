import { Query, Resolver, Arg, Ctx, ObjectType, Field, ID } from 'type-graphql';
import { type GraphQLContext, ReadModel } from '../../../shared';

@ObjectType()
export class SuggestedItems {
  @Field(() => String)
  sessionId!: string;

  @Field(() => [SuggestedItemsItems])
  items!: SuggestedItemsItems[];

  [key: string]: unknown;
}

@ObjectType()
export class SuggestedItemsItems {
  @Field(() => String)
  productId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Number)
  quantity!: number;

  @Field(() => String)
  reason!: string;
}

@Resolver()
export class ViewsSuggestedItemsQueryResolver {
  @Query(() => [SuggestedItems])
  async suggestedItems(
    @Ctx() ctx: GraphQLContext,
    @Arg('sessionId', () => ID, { nullable: true }) sessionId?: string,
  ): Promise<SuggestedItems[]> {
    const model = new ReadModel<SuggestedItems>(ctx.eventStore, 'SuggestedItemsProjection');

    // ## IMPLEMENTATION INSTRUCTIONS ##
    // You can query the projection using the ReadModel API:
    //
    // - model.getAll() — fetch all documents
    // - model.getById(id) — fetch a single document by ID (default key: 'id')
    // - model.find(filterFn) — filter documents using a predicate
    // - model.first(filterFn) — fetch the first document matching a predicate
    //
    // Example below uses `.find()` to filter
    // change the logic for the query as needed to meet the requirements for the current slice.

    return model.find((item) => {
      if (sessionId !== undefined && item.sessionId !== sessionId) return false;

      return true;
    });
  }
}
