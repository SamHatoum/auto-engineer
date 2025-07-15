import { FrontendScaffoldBuilder } from './builder';
// import { deleteDirectory } from './delete-directory';
import { hostCreatesAListingFlow, guestBooksAListingFlow } from './mock-flows';
import { runCodegen } from './run-codegen';
import { writeGqlOperationsToFolder } from './scaffold-gql-operations';
import { generateSchemaFile } from './write-graphql-schema';

export async function main(appName: string, flows: string[]) {
  // deleteDirectory(`../../../${appName}`);

  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter(`../../../${appName}`);
  await builder.build(`../../../${appName}`);
  writeGqlOperationsToFolder(flows, `../../../${appName}/src`);
  generateSchemaFile(`../../../${appName}`);
  runCodegen(`../../../${appName}`);
  return 'Frontend Scaffold is running!';
}

void main('example-booking-app', [guestBooksAListingFlow, hostCreatesAListingFlow]);