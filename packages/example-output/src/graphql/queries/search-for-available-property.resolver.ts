import {Query, Resolver, Arg, Ctx, ObjectType, Field} from 'type-graphql';
import {GraphQLContext} from "../context";
import {AvailableProperties, AvailableProperty} from "../../domain/shared/read-model";

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
        const model = new AvailableProperties(ctx.eventStore);
        return model.getAll();
    }

    @Query(() => [SearchPropertiesView])
    async searchProperties(
        @Ctx() ctx: GraphQLContext,
        @Arg('location', () => String, {nullable: true}) location?: string,
        @Arg('maxPrice', () => Number, {nullable: true}) maxPrice?: number,
        @Arg('minGuests', () => Number, {nullable: true}) minGuests?: number
    ): Promise<AvailableProperty[]> {
        const model = new AvailableProperties(ctx.eventStore);
        return model.search(location, maxPrice, minGuests);
    }
}