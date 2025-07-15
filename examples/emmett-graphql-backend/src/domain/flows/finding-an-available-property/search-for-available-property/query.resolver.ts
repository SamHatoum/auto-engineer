import { Query, Resolver, Arg, Ctx, ObjectType, Field } from 'type-graphql';
import {GraphQLContext, ReadModel} from '../../../shared';
import { AvailableProperty } from './state';

@ObjectType()
export class SearchPropertiesView {
    @Field(() => String)
    propertyId!: string;

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
    @Query(() => [SearchPropertiesView])
    async availableProperties(@Ctx() ctx: GraphQLContext): Promise<AvailableProperty[]> {
        const model = new ReadModel<AvailableProperty>(ctx.eventStore, 'availableProperties');
        return model.getAll();
    }

    @Query(() => [SearchPropertiesView])
    async searchProperties(
        @Ctx() ctx: GraphQLContext,
        @Arg('location', () => String, { nullable: true }) location?: string,
        @Arg('maxPrice', () => Number, { nullable: true }) maxPrice?: number,
        @Arg('minGuests', () => Number, { nullable: true }) minGuests?: number
    ): Promise<AvailableProperty[]> {
        const model = new ReadModel<AvailableProperty>(ctx.eventStore, 'availableProperties');
        return model.find((property) => {
            if (location && !property.location.toLowerCase().includes(location.toLowerCase())) return false;
            if (maxPrice && property.pricePerNight > maxPrice) return false;
            return !(minGuests && property.maxGuests < minGuests);
        });
    }
}