import { FrontendScaffoldBuilder } from './builder';
import { deleteDirectory } from './delete-directory';
import { hostCreatesAListingFlow, guestBooksAListingFlow } from './mock-flows';
import { runCodegen } from './run-codegen';
import { writeGqlOperationsToFolder } from './scaffold-gql-operations';
import { generateSchemaFile } from './write-graphql-schema';

export async function main(appName: string, flows: string[]) {
  deleteDirectory(`../emmett-example/${appName}`);

  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter();
  await builder.processFlowsWithAI(flows);
  await builder.build(`../emmett-example/${appName}`);
  writeGqlOperationsToFolder(flows, `../emmett-example/${appName}/src`);
  generateSchemaFile(`../emmett-example/${appName}`);
  runCodegen(`../emmett-example/${appName}`);
  return 'Frontend Scaffold is running!';
}

void main('example-booking-app', [guestBooksAListingFlow, hostCreatesAListingFlow]);
