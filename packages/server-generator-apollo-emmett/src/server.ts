import 'reflect-metadata';
import { ApolloServer } from 'apollo-server';
import { buildSchema } from 'type-graphql';
import { loadProjections, loadRegisterFiles, loadResolvers } from './utils';
import {
  getInMemoryEventStore,
  getInMemoryMessageBus,
  projections,
  forwardToMessageBus,
} from '@event-driven-io/emmett';

async function start() {
  const loadedProjections = await loadProjections('src/domain/flows/**/projection.{ts,js}');
  const registrations = await loadRegisterFiles('src/domain/flows/**/register.{ts,js}');

  const messageBus = getInMemoryMessageBus();

  const eventStore = getInMemoryEventStore({
    projections: projections.inline(loadedProjections),
    hooks: {
      onAfterCommit: forwardToMessageBus(messageBus),
    },
  });

  await Promise.all(registrations.map((r) => r.register(messageBus, eventStore)));

  const resolvers = await loadResolvers('src/domain/flows/**/*.resolver.{ts,js}');
  const schema = await buildSchema({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolvers: resolvers as unknown as [(...args: any[]) => any, ...Array<(...args: any[]) => any>],
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
}

void start();
