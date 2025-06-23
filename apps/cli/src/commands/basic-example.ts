import { program } from "commander";

export const runBasicExample = () => {
  program
    .version("1.0.0")
    .description("Basic Example")
    .option("-n, --name <type>", "Add your name")
    .action((_options) => {
      console.log(`Hey!`);
    });

  program.parse(process.argv);
}; 