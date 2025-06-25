import { FrontendScaffoldBuilder } from "./builder";
import { hostCreatesAListingFlow, guestBooksAListingFlow } from "./mock-flows";

export function main(appName: string, flows: string[]) {
  const builder = new FrontendScaffoldBuilder();
  builder.cloneStarter().processFlowsWithAI(flows, "./auto-ux-schema.json");
  return 'Frontend Scaffold is running!';
}

main("example-booking-app", [guestBooksAListingFlow, hostCreatesAListingFlow]);
