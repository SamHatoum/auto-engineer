import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
import * as path from 'path';
import createDebug from 'debug';

const debug = createDebug('cli:generate-client');

export const createGenerateClientCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('generate:client');

  command
    .description('Generate client application from IA schema and GraphQL schema')
    .argument('<starterDir>', 'Path to the starter template directory')
    .argument('<targetDir>', 'Target directory for the generated client')
    .argument('<iaSchemaPath>', 'Path to the IA schema JSON file')
    .argument('<gqlSchemaPath>', 'Path to the GraphQL schema file')
    .argument('<figmaVariablesPath>', 'Path to the Figma variables file')
    .action(
      async (
        starterDir: string,
        targetDir: string,
        iaSchemaPath: string,
        gqlSchemaPath: string,
        figmaVariablesPath: string,
      ) => {
        debug(
          'Command started with args - starter: %s, target: %s, ia: %s, gql: %s, figma: %s',
          starterDir,
          targetDir,
          iaSchemaPath,
          gqlSchemaPath,
          figmaVariablesPath,
        );
        try {
          await analytics.track({ command: 'generate:client:start', success: true });
          debug('Analytics tracked');

          // Resolve paths
          const resolvedStarterDir = path.resolve(starterDir);
          const resolvedTargetDir = path.resolve(targetDir);
          const resolvedIASchemaPath = path.resolve(iaSchemaPath);
          const resolvedGQLSchemaPath = path.resolve(gqlSchemaPath);
          debug('Paths resolved');

          output.info(`Generating client application`);
          output.info(`Starter template: ${resolvedStarterDir}`);
          output.info(`Target directory: ${resolvedTargetDir}`);
          output.info(`IA schema: ${resolvedIASchemaPath}`);
          output.info(`GraphQL schema: ${resolvedGQLSchemaPath}`);
          output.info(`Figma Variables: ${figmaVariablesPath}`);

          // Import the handler
          debug('Importing react-graphql-generator handler');
          const { handleGenerateClientCommand } = await import('@auto-engineer/react-graphql-generator');
          debug('Handler imported successfully');

          const generateCommand = {
            type: 'GenerateClient' as const,
            data: {
              starterDir: resolvedStarterDir,
              targetDir: resolvedTargetDir,
              iaSchemaPath: resolvedIASchemaPath,
              gqlSchemaPath: resolvedGQLSchemaPath,
              figmaVariablesPath: figmaVariablesPath,
            },
            timestamp: new Date(),
            requestId: `generate-client-${Date.now()}`,
          };

          debug('Calling handleGenerateClientCommand with request ID: %s', generateCommand.requestId);
          const result = await handleGenerateClientCommand(generateCommand);
          debug('Command handler returned result type: %s', result.type);

          if (result.type === 'ClientGenerated') {
            debug('Client generation successful');
            output.success(`✅ Client generated at: ${result.data.targetDir}`);
            await analytics.track({ command: 'generate:client', success: true });
            debug('Success analytics tracked');
          } else {
            debug('Client generation failed: %s', result.data.error);
            output.error(`❌ Failed to generate client: ${result.data.error}`);
            await analytics.track({ command: 'generate:client', success: false, errorCode: result.data.error });
            debug('Failure analytics tracked, exiting with code 1');
            process.exit(1);
          }
        } catch (error) {
          debug('Exception caught: %O', error);
          await analytics.track({ command: 'generate:client', success: false, errorCode: 'exception' });
          handleError(error instanceof Error ? error : new Error(String(error)));
          debug('Error handled, exiting with code 1');
          process.exit(1);
        }
      },
    );

  return command;
};
