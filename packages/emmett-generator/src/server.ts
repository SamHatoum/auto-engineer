import 'reflect-metadata';
import { ApolloServer } from 'apollo-server';
import { buildSchema } from 'type-graphql';
import { loadProjections } from './utils/loadProjections';
import { loadReactors, setupReactors } from './utils/loadReactors';
import {
    getInMemoryEventStore,
    getInMemoryMessageBus,
    projections
} from '@event-driven-io/emmett';
import {loadResolvers} from "./utils/loadResolvers";

async function start() {
    const loadedProjections = await loadProjections('src/domain/flows/**/projection.{ts,js}');
    const loadedReactors = await loadReactors('src/domain/flows/**/reactor.{ts,js}');
    const eventStore = getInMemoryEventStore({
        projections: projections.inline(loadedProjections),
    });
    const messageBus = getInMemoryMessageBus();
    await setupReactors(
        loadedReactors,
        eventStore,
        messageBus
    );
    const resolvers = await loadResolvers('src/domain/flows/**/*.resolver.{ts,js}');
    console.log('🚀 Loaded resolvers:', resolvers);
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
    console.log('✅ Projections loaded:', loadedProjections);
    console.log(`⚡ Loaded ${loadedReactors.length} workflow reactors`);
}

start();