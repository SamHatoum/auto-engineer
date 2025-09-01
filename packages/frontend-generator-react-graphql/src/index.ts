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
import createDebug from 'debug';

const debug = createDebug('frontend-generator-react-graphql');
const debugMain = createDebug('frontend-generator-react-graphql:main');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function main() {
  const [, , starterDir, targetDir, iaSchemaPath, gqlSchemaPath, figmaVariablesPath] = process.argv;
  debugMain(
    'Starting main with args: starterDir=%s, targetDir=%s, iaSchemaPath=%s, gqlSchemaPath=%s, figmaVariablesPath=%s',
    starterDir,
    targetDir,
    iaSchemaPath,
    gqlSchemaPath,
    figmaVariablesPath,
  );

  if (!targetDir) {
    debugMain('ERROR: Missing targetDir argument');
    console.error('Usage: tsx src/index.ts <starter-dir> <target-dir> <ia-schema> <gql-schema> <figma-variables>');
    process.exit(1);
  }

  debugMain('Creating FrontendScaffoldBuilder');
  const builder = new FrontendScaffoldBuilder();

  debugMain('Cloning starter from: %s', starterDir);
  await builder.cloneStarter(starterDir);

  debugMain('Building to target: %s', targetDir);
  await builder.build(targetDir);

  debugMain('Configuring starter with Figma variables: %s', figmaVariablesPath);
  configureStarter(figmaVariablesPath, targetDir);

  const filePath = path.resolve(__dirname, iaSchemaPath);
  debugMain('Reading IA schema from: %s', filePath);
  const iaSchemeJsonFile = fs.readFileSync(filePath, 'utf-8');
  const iaSchemeJson = JSON.parse(iaSchemeJsonFile) as IAScheme;
  debugMain('IA schema loaded successfully');

  debugMain('Generating components to: %s/src', targetDir);
  generateComponents(iaSchemeJson, `${targetDir}/src`);

  debugMain('Writing GraphQL operations to: %s/src', targetDir);
  writeGqlOperationsToFolder(iaSchemeJson, `${targetDir}/src`);

  debugMain('Generating GraphQL schema file from: %s', gqlSchemaPath);
  generateSchemaFile(gqlSchemaPath, targetDir);

  debugMain('Running codegen in: %s', targetDir);
  runCodegen(targetDir);

  debugMain('Frontend scaffold generation complete');
  return 'Frontend Scaffold is running!';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  debug('Running as main module');
  void main();
} else {
  debug('Module imported');
}

export { CLI_MANIFEST } from './cli-manifest';
export {
  commandHandler as generateClientCommandHandler,
  type GenerateClientCommand,
  type ClientGeneratedEvent,
  type ClientGenerationFailedEvent,
} from './commands/generate-client';
export {
  commandHandler as copyExampleCommandHandler,
  type CopyExampleCommand,
  type ExampleCopiedEvent,
  type ExampleCopyFailedEvent,
} from './commands/copy-example';
export * from './figma-helpers';
export * from './templates/createFile';
