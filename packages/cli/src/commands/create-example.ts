import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';

export const createCreateExampleCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('create:example');

  command
    .description('Create an example project')
    .argument('<example-name>', 'Name of the example to create')
    .option('--directory <path>', 'Target directory (defaults to current directory)')
    .action(async (exampleName: string, options: { directory?: string }) => {
      try {
        await analytics.track({ command: 'create:example:start', success: true });

        const targetDirectory = options.directory ?? process.cwd();

        output.info(`Creating example "${exampleName}" in ${targetDirectory}...`);

        // Import the handler
        const { handleCreateExampleCommand } = await import('@auto-engineer/flowlang');

        const createCommand = {
          type: 'CreateExample' as const,
          data: {
            exampleName,
            targetDirectory,
          },
          timestamp: new Date(),
          requestId: `create-example-${Date.now()}`,
        };

        // TODO use the bus
        const result = await handleCreateExampleCommand(createCommand);

        if (result.type === 'ExampleCreated') {
          output.success(`✅ Example "${exampleName}" created successfully!`);
          // output.info('');
          // output.info('Files created:');
          // result.data.filesCreated.forEach((file: string) => {
          // output.info(`  - ${file}`);
          // });
          output.info('');
          output.info('Next steps:');
          output.info('1. Review the generated files');
          output.info('2. Install dependencies: npm install');
          output.info('3. Start development: npm run dev');

          await analytics.track({ command: 'create:example', success: true });
        } else {
          output.error(`❌ Failed to create example: ${result.data.error}`);
          await analytics.track({ command: 'create:example', success: false, errorCode: result.data.error });
          process.exit(1);
        }
      } catch (error) {
        await analytics.track({
          command: 'create:example',
          success: false,
          errorCode: error instanceof Error ? error.message : String(error),
        });
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    });

  return command;
};
