import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { Config } from '../utils/config.js';
import { createOutput } from '../utils/terminal.js';
import { handleError } from '../utils/errors.js';
import { Analytics } from '../utils/analytics.js';

export const createStartCommand = (config: Config, analytics: Analytics) => {
  const output = createOutput(config);
  
  return new Command('start')
    .description('Start interactive mode to build something')
    .action(async () => {
      try {
        output.debug('Start command initiated');
        
        // Show welcome message
        output.info('Welcome to Auto Engineer! 🚀');
        output.log('Let\'s build something amazing together.\n');
        
        // Interactive prompt for what to build
        const { buildPrompt } = await inquirer.prompt([
          {
            type: 'input',
            name: 'buildPrompt',
            message: 'What would you like to build?',
            validate: (input: string) => {
              if (input.trim().length === 0) {
                return 'Please enter something you\'d like to build';
              }
              if (input.trim().length < 3) {
                return 'Please provide a more detailed description (at least 3 characters)';
              }
              return true;
            },
            transformer: (input: string) => input.trim(),
          },
        ]);
        
        output.debug(`User wants to build: ${buildPrompt}`);
        
        // Show thinking animation
        const spinner = ora('Thinking...').start();
        
        // Simulate thinking time
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        spinner.succeed('Got it!');
        
        // Process the build prompt
        output.success(`I understand you want to build: "${buildPrompt}"`);
        output.info('This is where the AI would analyze your request and start building...');
        
        // Track analytics
        await analytics.trackCommand('start', true);
        
        output.debug('Start command completed successfully');
        
      } catch (error: unknown) {
        await analytics.trackCommand('start', false, error instanceof Error ? error.message : 'unknown');
        if (error instanceof Error) {
          handleError(error);
        } else {
          handleError(new Error(String(error)));
        }
      }
    });
}; 