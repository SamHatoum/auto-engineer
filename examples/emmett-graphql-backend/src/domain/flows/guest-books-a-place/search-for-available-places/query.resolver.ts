import { Query, Resolver, Arg, Ctx, ObjectType, Field } from 'type-graphql';
import { GraphQLContext, ReadModel } from '../../../shared';
import { AvailablePlace } from './state';

@ObjectType()
export class SearchPlacesView {
  @Field(() => String)
  placeId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  location!: string;

  @Field(() => Number)
  pricePerNight!: number;

  @Field(() => Number)
  maxGuests!: number;

  [key: string]: unknown;
}

@Resolver()
export class SearchQueryResolver {
  @Query(() => [SearchPlacesView])
  async availablePlaces(@Ctx() ctx: GraphQLContext): Promise<AvailablePlace[]> {
    const model = new ReadModel<AvailablePlace>(ctx.eventStore, 'availableProperties');
    return model.getAll();
  }

  @Query(() => [SearchPlacesView])
  async searchPlaces(
    @Ctx() ctx: GraphQLContext,
    @Arg('location', () => String, { nullable: true }) location?: string,
    @Arg('maxPrice', () => Number, { nullable: true }) maxPrice?: number,
    @Arg('minGuests', () => Number, { nullable: true }) minGuests?: number,
  ): Promise<AvailablePlace[]> {
    const model = new ReadModel<AvailablePlace>(ctx.eventStore, 'availableProperties');
    return model.find((place) => {
      if (location && !place.location.toLowerCase().includes(location.toLowerCase())) return false;
      if (maxPrice && place.pricePerNight > maxPrice) return false;
      return !(minGuests && place.maxGuests < minGuests);
    });
  }
}
