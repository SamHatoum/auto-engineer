import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";

const COLORS = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];

export const runOraExample = async () => {
  const result = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Choose an option:",
      choices: ["Option 1", "Option 2", "Option 3"],
    },
  ]);

  // Create colored spinner frames
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const coloredFrames = COLORS.map(color => 
    spinnerFrames.map(frame => color(frame))
  ).flat();

  const spinner = ora({
    text: `Doing ${result.choice}...`,
    spinner: {
      interval: 80,
      frames: coloredFrames
    }
  }).start();

  setTimeout(() => {
    spinner.succeed(chalk.green("Done!"));
  }, 3000); // Simulate a task taking some time
}; 