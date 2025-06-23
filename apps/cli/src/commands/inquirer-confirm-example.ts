import chalk from "chalk";
import inquirer from "inquirer";

export const runInquirerConfirmExample = async () => {
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Do you want to proceed?",
    },
  ]);

  if (answers.confirm) {
    console.log(chalk.green("Let's move forward!"));
  } else {
    console.log(chalk.red("Operation cancelled."));
  }
}; 