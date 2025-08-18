import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
import * as path from 'path';

export const createImplementClientCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('implement:client');

  command
    .description('Use AI to implement the client application based on IA schema')
    .argument('<projectDir>', 'Client project directory to implement')
    .argument('<iaSchemeDir>', 'Directory containing the IA schema')
    .argument('<userPreferencesPath>', 'Path to user preferences markdown file')
    .argument('<designSystemPath>', 'Path to design system markdown file')
    .action(async (projectDir: string, iaSchemeDir: string, userPreferencesPath: string, designSystemPath: string) => {
      try {
        await analytics.track({ command: 'implement:client:start', success: true });

        // Resolve paths
        const resolvedProjectDir = path.resolve(projectDir);
        const resolvedIASchemeDir = path.resolve(iaSchemeDir);
        const resolvedUserPreferencesPath = path.resolve(userPreferencesPath);
        const resolvedDesignSystemPath = path.resolve(designSystemPath);

        output.info(`Implementing client application`);
        output.info(`Project directory: ${resolvedProjectDir}`);
        output.info(`IA schema directory: ${resolvedIASchemeDir}`);
        output.info(`User preferences: ${resolvedUserPreferencesPath}`);
        output.info(`Design system: ${resolvedDesignSystemPath}`);

        // Import the handler
        const { handleImplementClientCommand } = await import('@auto-engineer/frontend-implementation');

        const implementCommand = {
          type: 'ImplementClient' as const,
          data: {
            projectDir: resolvedProjectDir,
            iaSchemeDir: resolvedIASchemeDir,
            userPreferencesPath: resolvedUserPreferencesPath,
            designSystemPath: resolvedDesignSystemPath,
          },
          timestamp: new Date(),
          requestId: `implement-client-${Date.now()}`,
        };

        const result = await handleImplementClientCommand(implementCommand);

        if (result.type === 'ClientImplemented') {
          output.success(`✅ Client implemented successfully at: ${result.data.projectDir}`);
          await analytics.track({ command: 'implement:client', success: true });
        } else {
          output.error(`❌ Failed to implement client: ${result.data.error}`);
          await analytics.track({ command: 'implement:client', success: false, errorCode: result.data.error });
          process.exit(1);
        }
      } catch (error) {
        await analytics.track({ command: 'implement:client', success: false, errorCode: 'exception' });
        handleError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
};
