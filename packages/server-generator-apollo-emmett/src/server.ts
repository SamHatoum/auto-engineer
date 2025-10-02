import 'reflect-metadata';
import { ApolloServer } from 'apollo-server';
import { buildSchema } from 'type-graphql';
import { loadProjections, loadRegisterFiles, loadResolvers } from './utils';
import { getInMemoryMessageBus, getInMemoryDatabase, handleInMemoryProjections } from '@event-driven-io/emmett';
import { getSQLiteEventStore } from '@event-driven-io/emmett-sqlite';

async function start() {
  const loadedProjections = await loadProjections('src/domain/flows/**/projection.{ts,js}');
  const registrations = await loadRegisterFiles('src/domain/flows/**/register.{ts,js}');

  const messageBus = getInMemoryMessageBus();
  const database = getInMemoryDatabase();

  const eventStore = getSQLiteEventStore({
    fileName: './event-store.sqlite',
    schema: { autoMigration: 'CreateOrUpdate' },
  });
  try {
    await eventStore.readStream('__init__');
  } catch {
    // Expected on fresh DB - schema gets created on first operation
  }
  await Promise.all(registrations.map((r) => r.register(messageBus, eventStore)));
  const consumer = eventStore.consumer();
  consumer.processor({
    processorId: 'projection-updater',
    startFrom: 'BEGINNING',
    eachMessage: async (event) => {
      await handleInMemoryProjections({
        projections: loadedProjections,
        database,
        events: [event],
      });
    },
  });
  consumer.processor({
    processorId: 'forward-to-message-bus',
    startFrom: 'BEGINNING',
    eachMessage: async (evt) => {
      await messageBus.publish(evt);
    },
  });
  consumer.start().catch((err) => {
    console.error('Consumer crashed:', err);
    process.exit(1);
  });
  const shutdown = async () => {
    console.log('Shutting down...');
    try {
      await consumer.stop?.();
    } catch {
      /* empty */
    }
    try {
      await consumer.close?.();
    } catch {
      /* empty */
    }
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  const resolvers = await loadResolvers('src/domain/flows/**/*.resolver.{ts,js}');
  type ResolverClass = new (...args: unknown[]) => unknown;
  const schema = await buildSchema({
    resolvers: resolvers as unknown as [ResolverClass, ...ResolverClass[]],
  });
  const server = new ApolloServer({
    schema,
    context: () => ({
      eventStore,
      messageBus,
      database,
    }),
  });
  const { url } = await server.listen({ port: 4000 });
  console.log(`🚀 GraphQL server ready at ${url}`);
}

void start();
