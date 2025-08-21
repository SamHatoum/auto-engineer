import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { FrontendScaffoldBuilder } from './builder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import { deleteDirectory } from './delete-directory';
import { generateComponents } from './generator/generateComponents';
import { writeGqlOperationsToFolder } from './scaffold-gql-operations';
import { generateSchemaFile } from './write-graphql-schema';
import { runCodegen } from './run-codegen';
import { IAScheme } from './types';

export async function main() {
  const [, , starterDir, targetDir, iaSchemaPath, gqlSchemaPath, figmaVariablesPath] = process.argv;
  if (!targetDir) {
    console.error('Usage: tsx src/index.ts <starter-dir> <target-dir>');
    process.exit(1);
  }

  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter(starterDir);
  await builder.configureStarter(figmaVariablesPath);
  await builder.build(targetDir);

  const filePath = path.resolve(__dirname, iaSchemaPath);
  const iaSchemeJsonFile = fs.readFileSync(filePath, 'utf-8');
  const iaSchemeJson = JSON.parse(iaSchemeJsonFile) as IAScheme;
  generateComponents(iaSchemeJson, `${targetDir}/src`);

  writeGqlOperationsToFolder(iaSchemeJson, `${targetDir}/src`);
  generateSchemaFile(gqlSchemaPath, targetDir);
  runCodegen(targetDir);
  return 'Frontend Scaffold is running!';
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

export * from './commands/generate-client';
