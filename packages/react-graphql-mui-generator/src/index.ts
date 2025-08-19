import path from 'path';
import fs from 'fs';
import { FrontendScaffoldBuilder } from './builder';
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

void main();
