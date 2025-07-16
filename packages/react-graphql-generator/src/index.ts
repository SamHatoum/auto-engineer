import { FrontendScaffoldBuilder } from './builder';
// import { deleteDirectory } from './delete-directory';
import { hostCreatesAListingFlow, guestBooksAListingFlow } from './mock-flows';
import { runCodegen } from './run-codegen';
import { writeGqlOperationsToFolder } from './scaffold-gql-operations';
import { generateSchemaFile } from './write-graphql-schema';

export async function main(appName: string, flows: string[]) {
  // deleteDirectory(`../../../auto-engineer-output/${appName}`);

  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter(`../../../auto-engineer-output/${appName}`);
  await builder.build(`../../../auto-engineer-output/${appName}`);
  writeGqlOperationsToFolder(flows, `../../../auto-engineer-output/${appName}/src`);
  generateSchemaFile(`../../../auto-engineer-output/${appName}`);
  runCodegen(`../../../auto-engineer-output/${appName}`);
  return 'Frontend Scaffold is running!';
}

void main('client', [guestBooksAListingFlow, hostCreatesAListingFlow]);
