import { FrontendScaffoldBuilder } from "./builder";

export async function main(appName: string) {
  const builder = new FrontendScaffoldBuilder();
  await builder.cloneStarter();
  await builder.build(`../emmett-example/${appName}`);
  return 'Frontend Scaffold is running!';
}

void main("example-booking-app");
