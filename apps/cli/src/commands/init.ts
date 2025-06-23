import { Command } from 'commander';
import inquirer from 'inquirer';
import { Config } from '../utils/config.js';
import { createOutput } from '../utils/terminal.js';
import { handleError } from '../utils/errors.js';
import { Analytics } from '../utils/analytics.js';
import path from 'path';
import fs from 'fs/promises';

export const createInitCommand = (config: Config, analytics: Analytics) => {
  const output = createOutput(config);
  
  return new Command('init')
    .description('Initialize auto-engineer configuration for your project')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .option('-p, --path <path>', 'Project path (default: current directory)')
    .action(async (options) => {
      try {
        output.debug('Init command started');
        
        const projectPath = options.path || process.cwd();
        
        // Check if already initialized
        const configPath = path.join(projectPath, '.auto-engineer.json');
        try {
          await fs.access(configPath);
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: 'Auto-engineer is already initialized. Overwrite existing configuration?',
              default: false,
            },
          ]);
          
          if (!overwrite) {
            output.info('Initialization cancelled');
            return;
          }
        } catch {
          // File doesn't exist, continue with initialization
        }
        
        // Auto-detect project type (Section 1.7 - Zero configuration)
        let projectType = 'unknown';
        let packageManager = 'npm';
        
        try {
          const packageJsonPath = path.join(projectPath, 'package.json');
          await fs.access(packageJsonPath);
          projectType = 'node';
          
          // Check for package manager
          if (await fs.access(path.join(projectPath, 'pnpm-lock.yaml')).then(() => true).catch(() => false)) {
            packageManager = 'pnpm';
          } else if (await fs.access(path.join(projectPath, 'yarn.lock')).then(() => true).catch(() => false)) {
            packageManager = 'yarn';
          }
        } catch {
          // No package.json found
        }
        
        // Auto-detect TypeScript
        const hasTypeScript = await fs.access(path.join(projectPath, 'tsconfig.json')).then(() => true).catch(() => false);
        
        // Auto-detect test framework
        let testFramework = 'none';
        try {
          const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8'));
          if (packageJson.devDependencies) {
            if (packageJson.devDependencies.vitest) testFramework = 'vitest';
            else if (packageJson.devDependencies.jest) testFramework = 'jest';
            else if (packageJson.devDependencies.mocha) testFramework = 'mocha';
          }
        } catch {
          // Could not read package.json
        }
        
        let configData: any = {};
        
        if (!options.yes) {
          // Interactive configuration
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'projectType',
              message: 'What type of project is this?',
              choices: [
                { name: 'Node.js/TypeScript', value: 'node-ts' },
                { name: 'Node.js/JavaScript', value: 'node-js' },
                { name: 'React/Next.js', value: 'react' },
                { name: 'Other', value: 'other' },
              ],
              default: projectType === 'node' ? (hasTypeScript ? 'node-ts' : 'node-js') : 'other',
            },
            {
              type: 'list',
              name: 'packageManager',
              message: 'Which package manager do you use?',
              choices: [
                { name: 'npm', value: 'npm' },
                { name: 'yarn', value: 'yarn' },
                { name: 'pnpm', value: 'pnpm' },
              ],
              default: packageManager,
            },
            {
              type: 'list',
              name: 'testFramework',
              message: 'Which test framework do you use?',
              choices: [
                { name: 'Vitest', value: 'vitest' },
                { name: 'Jest', value: 'jest' },
                { name: 'Mocha', value: 'mocha' },
                { name: 'None', value: 'none' },
              ],
              default: testFramework,
            },
            {
              type: 'confirm',
              name: 'enableLinting',
              message: 'Enable code linting and formatting?',
              default: true,
            },
            {
              type: 'confirm',
              name: 'enableGitHooks',
              message: 'Set up Git hooks for pre-commit checks?',
              default: true,
            },
          ]);
          
          configData = answers;
        } else {
          // Use auto-detected defaults
          configData = {
            projectType: projectType === 'node' ? (hasTypeScript ? 'node-ts' : 'node-js') : 'other',
            packageManager,
            testFramework,
            enableLinting: true,
            enableGitHooks: true,
          };
        }
        
        // Add metadata
        configData.initializedAt = new Date().toISOString();
        configData.version = process.env.npm_package_version || '0.1.2';
        
        // Write configuration file
        await fs.writeFile(configPath, JSON.stringify(configData, null, 2));
        
        output.success('Auto-engineer initialized successfully!');
        output.info(`Configuration saved to ${configPath}`);
        
        // Provide next steps
        output.log('\nNext steps:');
        output.log('1. Review the generated configuration');
        output.log('2. Run "auto-engineer generate" to create templates');
        output.log('3. Run "auto-engineer analyze" to check your code');
        
        // Track analytics
        await analytics.trackCommand('init', true);
        
        output.debug('Init command completed successfully');
        
      } catch (error: unknown) {
        await analytics.trackCommand('init', false, error instanceof Error ? error.message : 'unknown');
        if (error instanceof Error) {
          handleError(error);
        } else {
          handleError(new Error(String(error)));
        }
      }
    });
}; 