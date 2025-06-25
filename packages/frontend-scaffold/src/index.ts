import { FrontendScaffoldBuilder } from "./builder";

export function main() {
  const builder = new FrontendScaffoldBuilder();
  builder.cloneStarter().anotherMethod();
  return 'Frontend Scaffold is running!';
}

main();
