import { FrontendScaffoldBuilder } from "./builder";
import { hostCreatesAListingFlow, guestBooksAListingFlow } from "./mock-flows";

export async function main(appName: string, flows: string[]) {
  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter();
  await builder.processFlowsWithAI(flows);
  await builder.build(`./${appName}`);
  return 'Frontend Scaffold is running!';
}

main("example-booking-app", [guestBooksAListingFlow, hostCreatesAListingFlow]);
