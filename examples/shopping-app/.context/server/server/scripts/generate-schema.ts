import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { printSchema } from 'graphql';
import { writeFile } from 'fs/promises';
import * as path from 'path';
import { loadResolvers } from '../src/utils/loadResolvers.js';

async function main() {
  try {
    const resolvers = await loadResolvers('src/domain/flows/**/*.resolver.{ts,js}');
    const schema = await buildSchema({
      resolvers: resolvers as any,
      emitSchemaFile: false,
    });
    const printedSchema = printSchema(schema);

    const contextDir = path.resolve(
      '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/shopping-app/.context/server',
      '.context',
    );
    const schemaPath = path.join(contextDir, 'schema.graphql');
    await writeFile(schemaPath, printedSchema, 'utf-8');

    console.log(`✅ GraphQL schema generated at: ${schemaPath}`);
  } catch (error) {
    console.error(`❌ GraphQL schema generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
