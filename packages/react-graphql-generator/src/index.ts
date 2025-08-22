import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { FrontendScaffoldBuilder } from './builder';
import { configureStarter } from './configure-starter'; // New import
import { generateComponents } from './generator/generateComponents';
import { writeGqlOperationsToFolder } from './scaffold-gql-operations';
import { generateSchemaFile } from './write-graphql-schema';
import { runCodegen } from './run-codegen';
import { IAScheme } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function main() {
  const [, , starterDir, targetDir, iaSchemaPath, gqlSchemaPath, figmaVariablesPath] = process.argv;
  if (!targetDir) {
    console.error('Usage: tsx src/index.ts <starter-dir> <target-dir> <ia-schema> <gql-schema> <figma-variables>');
    process.exit(1);
  }

  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter(starterDir);
  // await builder.configureStarter(figmaVariablesPath);
  await builder.build(targetDir);
  configureStarter(figmaVariablesPath, targetDir);

  const filePath = path.resolve(__dirname, iaSchemaPath);
  const iaSchemeJsonFile = fs.readFileSync(filePath, 'utf-8');
  const iaSchemeJson = JSON.parse(iaSchemeJsonFile) as IAScheme;
  generateComponents(iaSchemeJson, `${targetDir}/src`);
  writeGqlOperationsToFolder(iaSchemeJson, `${targetDir}/src`);
  generateSchemaFile(gqlSchemaPath, targetDir);
  runCodegen(targetDir);
  return 'Frontend Scaffold is running!';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

export * from './commands/generate-client';
export * from './figma-helpers';
