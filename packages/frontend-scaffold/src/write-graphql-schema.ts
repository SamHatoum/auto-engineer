import * as fs from 'fs';
import * as path from 'path';

function getSchema(): string {
  const schemaPath = path.join(__dirname, 'mock-schema.graphql');
  return fs.readFileSync(schemaPath, 'utf-8');
}

export function generateSchemaFile(outputDir: string): void {
  const schemaContent = getSchema();
  const fullPath = path.join(outputDir, 'schema.graphql');

  fs.writeFileSync(fullPath, schemaContent, 'utf-8');
  console.log(`✅ schema.graphql written to ${fullPath}`);
}
