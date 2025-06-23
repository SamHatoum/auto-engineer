import chalk from "chalk";
import ora from "ora";

const COLORS = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];

export const runCyclingSpinnerExample = async () => {
  console.log(chalk.blue("🚀 Starting cycling color spinner example...\n"));

  // Example 1: Basic cycling spinner
  console.log(chalk.yellow("Example 1: Basic cycling spinner"));
  await runBasicCyclingSpinner("Processing data");

  // Example 2: Cycling spinner with different frame sets
  console.log(chalk.yellow("\nExample 2: Cycling spinner with dots"));
  await runDotsSpinner("Building project");

  // Example 3: Cycling spinner with custom characters
  console.log(chalk.yellow("\nExample 3: Cycling spinner with custom characters"));
  await runCustomCharSpinner("Analyzing codebase");
};

const runBasicCyclingSpinner = async (text: string): Promise<void> => {
  // Create colored spinner frames
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const coloredFrames = COLORS.map(color => 
    spinnerFrames.map(frame => color(frame))
  ).flat();

  const spinner = ora({
    text: text,
    spinner: {
      interval: 80,
      frames: coloredFrames
    }
  }).start();

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  spinner.succeed(chalk.green(`${text} completed!`));
};

const runDotsSpinner = async (text: string): Promise<void> => {
  // Create colored dots spinner
  const dotsFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const coloredDots = COLORS.map(color => 
    dotsFrames.map(frame => color(frame))
  ).flat();

  const spinner = ora({
    text: text,
    spinner: {
      interval: 100,
      frames: coloredDots
    }
  }).start();

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  spinner.succeed(chalk.green(`${text} completed!`));
};

const runCustomCharSpinner = async (text: string): Promise<void> => {
  // Create custom character spinner with colors
  const customFrames = ['◐', '◓', '◑', '◒'];
  const coloredCustom = COLORS.map(color => 
    customFrames.map(frame => color(frame))
  ).flat();

  const spinner = ora({
    text: text,
    spinner: {
      interval: 120,
      frames: coloredCustom
    }
  }).start();

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  spinner.succeed(chalk.green(`${text} completed!`));
}; 