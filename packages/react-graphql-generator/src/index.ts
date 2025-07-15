import { FrontendScaffoldBuilder } from './builder';
// import { deleteDirectory } from './delete-directory';
import { runCodegen } from './run-codegen';
import { writeGqlOperationsToFolder } from './scaffold-gql-operations';
import { generateSchemaFile } from './write-graphql-schema';
import { readFile } from 'fs/promises';

export async function main(appName: string) {
  // deleteDirectory(`../../../${appName}`);

  const [, , ...flowFiles] = process.argv;
  if (flowFiles.length === 0) {
    console.error('Usage: tsx src/index.ts <flow-file-1> <flow-file-2> ...');
    process.exit(1);
  }

  const flows: string[] = await Promise.all(flowFiles.map((flow) => readFile(flow, 'utf-8')));

  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter(`../../../${appName}`);
  await builder.build(`../../../${appName}`);
  writeGqlOperationsToFolder(flows, `../../../${appName}/src`);
  generateSchemaFile(`../../../${appName}`);
  runCodegen(`../../../${appName}`);
  return 'Frontend Scaffold is running!';
}

void main('example-booking-app');