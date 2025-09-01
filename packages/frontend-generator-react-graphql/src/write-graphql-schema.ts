import * as fs from 'fs';
import * as path from 'path';

function getSchema(gqlSchemaPath: string): string {
  // gqlSchemaPath should already be an absolute path from the CLI
  const schemaPath = path.isAbsolute(gqlSchemaPath) ? gqlSchemaPath : path.resolve(gqlSchemaPath);
  return fs.readFileSync(schemaPath, 'utf-8');
}

export function generateSchemaFile(gqlSchemaPath: string, outputDir: string): void {
  const schemaContent = getSchema(gqlSchemaPath);
  const fullPath = path.join(outputDir, 'schema.graphql');

  fs.writeFileSync(fullPath, schemaContent, 'utf-8');
  console.log(`✅ schema.graphql written to ${fullPath}`);
}
