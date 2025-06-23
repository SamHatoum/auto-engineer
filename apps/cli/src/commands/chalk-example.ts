import { program } from "commander";
import chalk from "chalk";

export const runChalkExample = () => {
  program
    .version("1.0.0")
    .description("Chalk Example")
    .option("-n, --name <type>", "Add your name")
    .action((_options) => {
      console.log(chalk.blue(`Hey!`));
      console.log(chalk.green(`Hey!`));
      console.log(chalk.red(`Hey!`));
    });

  program.parse(process.argv);
}; 