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
  const [, , starterDir, designSystemDir, targetDir, iaSchemaPath, gqlSchemaPath] = process.argv;
  if (!designSystemDir || !targetDir) {
    console.error('Usage: tsx src/index.ts <starter-dir> <target-dir>');
    process.exit(1);
  }

  console.log('designSystemDir', designSystemDir);
  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter(starterDir, designSystemDir);
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

export * from './commands/generate-client';
