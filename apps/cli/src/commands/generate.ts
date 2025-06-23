import { Command } from 'commander';
import ora from 'ora';
import inquirer from 'inquirer';
import { Config } from '../utils/config.js';
import { createOutput } from '../utils/terminal.js';
import { handleError, createError } from '../utils/errors.js';
import { Analytics } from '../utils/analytics.js';
import { isStdinAvailable, readStdin } from '../utils/terminal.js';

export const createGenerateCommand = (config: Config, analytics: Analytics) => {
  const output = createOutput(config);
  
  return new Command('generate')
    .description('Generate code, documentation, or other artifacts')
    .option('-t, --type <type>', 'Type of generation (code, docs, tests)')
    .option('-o, --output <path>', 'Output path for generated files')
    .option('-f, --force', 'Overwrite existing files')
    .option('--stdin', 'Read input from STDIN')
    .action(async (options) => {
      try {
        output.debug('Generate command started');
        
        let input = '';
        
        // Handle STDIN input (Section 3.1)
        if (options.stdin || isStdinAvailable()) {
          output.info('Reading input from STDIN...');
          input = await readStdin();
          output.debug(`STDIN input: ${input.substring(0, 100)}...`);
        }
        
        // Interactive prompts for missing options (Section 1.2 - Empathic CLIs)
        let type = options.type;
        if (!type) {
          const { selectedType } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedType',
              message: 'What would you like to generate?',
              choices: [
                { name: 'Code templates', value: 'code' },
                { name: 'Documentation', value: 'docs' },
                { name: 'Test files', value: 'tests' },
                { name: 'Configuration files', value: 'config' },
              ],
            },
          ]);
          type = selectedType;
        }
        
        let outputPath = options.output;
        if (!outputPath) {
          const { path } = await inquirer.prompt([
            {
              type: 'input',
              name: 'path',
              message: 'Where should the generated files be saved?',
              default: `./generated-${type}`,
            },
          ]);
          outputPath = path;
        }
        
        // Validate inputs
        if (!type) {
          throw createError('Generation type is required', 'E4005');
        }
        
        if (!outputPath) {
          throw createError('Output path is required', 'E4006');
        }
        
        // Show progress spinner (Section 1.5 - Rich interactions)
        const spinner = ora('Generating files...').start();
        
        // Simulate generation process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        spinner.succeed('Files generated successfully!');
        
        // Provide helpful output
        output.success(`Generated ${type} files in ${outputPath}`);
        output.info('You can now review and customize the generated files');
        
        // Track analytics
        await analytics.trackCommand('generate', true);
        
        output.debug('Generate command completed successfully');
        
      } catch (error: unknown) {
        await analytics.trackCommand('generate', false, error instanceof Error ? error.message : 'unknown');
        if (error instanceof Error) {
          handleError(error);
        } else {
          handleError(new Error(String(error)));
        }
      }
    });
}; 