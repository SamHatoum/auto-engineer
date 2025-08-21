import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
import * as path from 'path';

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
        try {
          await analytics.track({ command: 'generate:client:start', success: true });

          // Resolve paths
          const resolvedStarterDir = path.resolve(starterDir);
          const resolvedTargetDir = path.resolve(targetDir);
          const resolvedIASchemaPath = path.resolve(iaSchemaPath);
          const resolvedGQLSchemaPath = path.resolve(gqlSchemaPath);

          output.info(`Generating client application`);
          output.info(`Starter template: ${resolvedStarterDir}`);
          output.info(`Target directory: ${resolvedTargetDir}`);
          output.info(`IA schema: ${resolvedIASchemaPath}`);
          output.info(`GraphQL schema: ${resolvedGQLSchemaPath}`);
          output.info(`Figma Variables: ${figmaVariablesPath}`);

          // Import the handler
          const { handleGenerateClientCommand } = await import('@auto-engineer/react-graphql-shadcn-generator');

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

          const result = await handleGenerateClientCommand(generateCommand);

          if (result.type === 'ClientGenerated') {
            output.success(`✅ Client generated at: ${result.data.targetDir}`);
            await analytics.track({ command: 'generate:client', success: true });
          } else {
            output.error(`❌ Failed to generate client: ${result.data.error}`);
            await analytics.track({ command: 'generate:client', success: false, errorCode: result.data.error });
            process.exit(1);
          }
        } catch (error) {
          await analytics.track({ command: 'generate:client', success: false, errorCode: 'exception' });
          handleError(error instanceof Error ? error : new Error(String(error)));
          process.exit(1);
        }
      },
    );

  return command;
};
