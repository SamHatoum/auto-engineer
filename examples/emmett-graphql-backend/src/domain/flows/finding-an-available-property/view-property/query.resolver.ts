import { Resolver, Query, Arg, Ctx, ObjectType, Field } from 'type-graphql';
import { GraphQLContext, ReadModel } from '../../../shared';
import { ViewProperty } from './state';

@ObjectType()
export class ViewPropertyView {
  @Field(() => String)
  propertyId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  location!: string;

  @Field(() => String)
  address!: string;

  @Field(() => String)
  description!: string;

  @Field(() => [String])
  amenities!: string[];

  [key: string]: unknown;
}

@Resolver()
export class ViewPropertyResolver {
  @Query(() => ViewPropertyView, { nullable: true })
  async viewProperty(
    @Ctx() ctx: GraphQLContext,
    @Arg('propertyId', () => String) propertyId: string,
  ): Promise<ViewProperty | null> {
    const model = new ReadModel<ViewProperty>(ctx.eventStore, 'viewProperties');
    return model.getById(propertyId);
  }

  @Query(() => [ViewPropertyView])
  async allViewProperties(@Ctx() ctx: GraphQLContext): Promise<ViewProperty[]> {
    const model = new ReadModel<ViewProperty>(ctx.eventStore, 'viewProperties');
    return model.getAll();
  }
}
