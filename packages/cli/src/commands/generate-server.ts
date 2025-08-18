import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';

export const createGenerateServerCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('generate:server');

  command
    .description('Generate server implementation from schema.json into ./server')
    .argument('<schemaPath>', 'Path to .context/schema.json')
    .option('--destination <path>', 'Destination project root (default: current directory)')
    .action(async (schemaPath: string, options: { destination?: string }) => {
      try {
        await analytics.track({ command: 'generate:server:start', success: true });

        const destination = options.destination ?? process.cwd();
        output.info(`Generating server from schema: ${schemaPath}`);
        output.info(`Destination: ${destination}`);

        // Import the handler
        const { handleGenerateServerCommand } = await import('@auto-engineer/emmett-generator');

        const generateCommand = {
          type: 'GenerateServer' as const,
          data: {
            schemaPath,
            destination,
          },
          timestamp: new Date(),
          requestId: `generate-server-${Date.now()}`,
        };

        const result = await handleGenerateServerCommand(generateCommand);

        if (result.type === 'ServerGenerated') {
          output.success(`✅ Server generated at: ${result.data.serverDir}`);
          const schemaOut = result.data.contextSchemaGraphQL;
          if (typeof schemaOut === 'string' && schemaOut.length > 0) {
            output.info(`GraphQL schema: ${schemaOut}`);
          }
          await analytics.track({ command: 'generate:server', success: true });
        } else {
          output.error(`❌ Failed to generate server: ${result.data.error}`);
          await analytics.track({ command: 'generate:server', success: false, errorCode: result.data.error });
          process.exit(1);
        }
      } catch (error) {
        await analytics.track({ command: 'generate:server', success: false, errorCode: 'exception' });
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    });

  return command;
};
