import { Mutation, Resolver, Arg, Ctx } from 'type-graphql';
import { handle } from './handle';
import { GraphQLContext } from '../../../shared';
import { toMutationResponse } from '../../../shared';
import { MutationResponse } from '../../../shared';

@Resolver()
export class CreateListingResolver {
    @Mutation(() => MutationResponse)
    async createListing(
        @Arg('input') input: any,
        @Ctx() ctx: GraphQLContext
    ): Promise<MutationResponse> {
        const result = await handle(ctx.eventStore, {
            type: 'CreateListing',
            data: input,
        });
        return toMutationResponse(result);
    }
}