import * as fs from 'fs';
import * as path from 'path';

function getSchema(gqlSchemaPath: string): string {
  const schemaPath = path.join(__dirname, gqlSchemaPath);
  return fs.readFileSync(schemaPath, 'utf-8');
}

export function generateSchemaFile(gqlSchemaPath: string, outputDir: string): void {
  const schemaContent = getSchema(gqlSchemaPath);
  const fullPath = path.join(outputDir, 'schema.graphql');

  fs.writeFileSync(fullPath, schemaContent, 'utf-8');
  console.log(`✅ schema.graphql written to ${fullPath}`);
}
