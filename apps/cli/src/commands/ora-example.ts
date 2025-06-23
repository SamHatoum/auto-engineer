import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";

export const runOraExample = async () => {
  const result = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Choose an option:",
      choices: ["Option 1", "Option 2", "Option 3"],
    },
  ]);

  const spinner = ora(`Doing ${result.choice}...`).start();

  setTimeout(() => {
    spinner.succeed(chalk.green("Done!"));
  }, 3000); // Simulate a task taking some time
}; 