import { FrontendScaffoldBuilder } from "./builder";
import { hostCreatesAListingFlow, guestBooksAListingFlow } from "./mock-flows";

export async function main(appName: string, flows: string[]) {
  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter();
  await builder.processFlowsWithAI(flows);
  await builder.build(`../emmett-example/${appName}`);
  return 'Frontend Scaffold is running!';
}

void main("example-booking-app", [guestBooksAListingFlow, hostCreatesAListingFlow]);
