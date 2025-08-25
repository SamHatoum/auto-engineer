import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';

export const createCopyExampleCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('copy:example');

  command
    .description('Copy a starter template to the current directory')
    .argument('<starter-name>', 'Name of the starter to copy (shadcn-starter or mui-starter)')
    .option('--directory <path>', 'Target directory (defaults to current directory)')
    .action(async (starterName: string, options: { directory?: string }) => {
      try {
        await analytics.track({ command: 'copy:example:start', success: true });

        const targetDirectory = options.directory ?? process.cwd();

        output.info(`Copying starter "${starterName}" to ${targetDirectory}/.auto/${starterName}...`);

        // Import the handler
        const { handleCopyExampleCommand } = await import('@auto-engineer/react-graphql-generator');

        const copyCommand = {
          type: 'CopyExample' as const,
          data: {
            starterName,
            targetDir: targetDirectory,
          },
          timestamp: new Date(),
          requestId: `copy-example-${Date.now()}`,
        };

        const result = await handleCopyExampleCommand(copyCommand);

        if (result.type === 'ExampleCopied') {
          output.success(`✅ Starter "${starterName}" copied successfully to ${result.data.targetDir}`);
          output.info('');
          output.info('Next steps:');
          output.info(`1. Navigate to the starter: cd ${result.data.targetDir}`);
          output.info('2. Install dependencies: npm install');
          output.info('3. Start development: npm run dev');

          await analytics.track({ command: 'copy:example', success: true });
        } else {
          output.error(`❌ Failed to copy starter: ${result.data.error}`);
          await analytics.track({ command: 'copy:example', success: false, errorCode: result.data.error });
          process.exit(1);
        }
      } catch (error) {
        await analytics.track({
          command: 'copy:example',
          success: false,
          errorCode: error instanceof Error ? error.message : String(error),
        });
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    });

  return command;
};
