import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
import { execa } from 'execa';
import * as path from 'path';
import { existsSync } from 'fs';

export const createGenerateGQLSchemaCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('generate:gql-schema');

  command
    .description('Generate GraphQL schema from server resolvers')
    .argument('<serverPath>', 'Path to the server directory')
    .action(async (serverPath: string) => {
      try {
        await analytics.track({ command: 'generate:gql-schema:start', success: true });

        const absServerPath = path.resolve(serverPath);

        // Check if server directory exists
        if (!existsSync(absServerPath)) {
          output.error(`❌ Server directory not found: ${absServerPath}`);
          await analytics.track({ command: 'generate:gql-schema', success: false, errorCode: 'server_not_found' });
          process.exit(1);
        }

        // Check if generate-schema script exists
        const schemaScriptPath = path.join(absServerPath, 'scripts', 'generate-schema.ts');
        if (!existsSync(schemaScriptPath)) {
          output.error(`❌ GraphQL schema generation script not found at: ${schemaScriptPath}`);
          output.info('Please ensure the server was generated with generate:server command first');
          await analytics.track({ command: 'generate:gql-schema', success: false, errorCode: 'script_not_found' });
          process.exit(1);
        }

        output.info(`🔄 Generating GraphQL schema from: ${absServerPath}`);

        try {
          // Run the schema generation script
          await execa('npx', ['tsx', 'scripts/generate-schema.ts'], {
            cwd: absServerPath,
            stdio: 'inherit',
          });

          output.success(`✅ GraphQL schema generated successfully`);
          await analytics.track({ command: 'generate:gql-schema', success: true });
        } catch (execError) {
          output.error(`❌ Failed to generate GraphQL schema`);
          if (execError instanceof Error) {
            output.error(execError.message);
          }
          await analytics.track({ command: 'generate:gql-schema', success: false, errorCode: 'generation_failed' });
          process.exit(1);
        }
      } catch (error) {
        await analytics.track({ command: 'generate:gql-schema', success: false, errorCode: 'exception' });
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    });

  return command;
};
