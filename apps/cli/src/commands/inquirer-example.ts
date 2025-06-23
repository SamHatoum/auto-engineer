import chalk from "chalk";
import inquirer from "inquirer";

export const runInquirerExample = async () => {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "What's your name?",
    },
  ]);

  console.log(chalk.green(`Hey there, ${answers.name}!`));
}; 