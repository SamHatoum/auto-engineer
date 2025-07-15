import { Resolver, Query, Arg, Ctx, ObjectType, Field } from 'type-graphql';
import { GraphQLContext, ReadModel } from '../../../shared';
import { ViewPlace } from './state';

@ObjectType()
export class ViewPlaceView {
  @Field(() => String)
  placeId!: string;

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
export class ViewPlaceResolver {
  @Query(() => ViewPlaceView, { nullable: true })
  async viewPlace(
    @Ctx() ctx: GraphQLContext,
    @Arg('placeId', () => String) placeId: string,
  ): Promise<ViewPlace | null> {
    const model = new ReadModel<ViewPlace>(ctx.eventStore, 'viewProperties');
    return model.getById(placeId);
  }

  @Query(() => [ViewPlaceView])
  async allViewPlaces(@Ctx() ctx: GraphQLContext): Promise<ViewPlace[]> {
    const model = new ReadModel<ViewPlace>(ctx.eventStore, 'viewProperties');
    return model.getAll();
  }
}
