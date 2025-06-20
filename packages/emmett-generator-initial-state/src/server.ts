import 'reflect-metadata';
import { ApolloServer } from 'apollo-server';
import { buildSchema } from 'type-graphql';
import { getResolvers } from './graphql/loadResolvers';
import { loadProjections } from './utils/loadProjections';
import { loadReactors, setupWorkflowReactors } from './utils/loadReactors';
import {
    getInMemoryEventStore,
    getInMemoryMessageBus,
    projections
} from '@event-driven-io/emmett';

async function start() {
    const loadedProjections = await loadProjections();
    const loadedReactors = await loadReactors();
    const eventStore = getInMemoryEventStore({
        projections: projections.inline(loadedProjections),
    });
    const messageBus = getInMemoryMessageBus();
    await setupWorkflowReactors(
        loadedReactors,
        eventStore,
        messageBus
    );
    const resolvers = await getResolvers();
    const schema = await buildSchema({
        resolvers,
    });
    const server = new ApolloServer({
        schema,
        context: () => ({
            eventStore,
            messageBus,
        }),
    });
    const { url } = await server.listen({ port: 4000 });
    console.log(`🚀 GraphQL server ready at ${url}`);
    console.log(`📡 Loaded ${loadedProjections.length} projections`);
    console.log(`⚡ Loaded ${loadedReactors.length} workflow reactors`);
}

start();