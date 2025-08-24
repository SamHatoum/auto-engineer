import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
import * as path from 'path';
import createDebug from 'debug';

const debug = createDebug('cli:implement-client');

export const createImplementClientCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('implement:client');

  command
    .description('Use AI to implement the client application based on IA schema')
    .argument('<projectDir>', 'Client project directory to implement')
    .argument('<iaSchemeDir>', 'Directory containing the IA schema')
    .argument('<designSystemPath>', 'Path to design system markdown file')
    .action(async (projectDir: string, iaSchemeDir: string, designSystemPath: string) => {
      debug(
        'Command started with args - projectDir: %s, iaSchemeDir: %s, designSystemPath: %s',
        projectDir,
        iaSchemeDir,
        designSystemPath,
      );
      try {
        await analytics.track({ command: 'implement:client:start', success: true });
        debug('Analytics tracked');

        // Resolve paths
        const resolvedProjectDir = path.resolve(projectDir);
        const resolvedIASchemeDir = path.resolve(iaSchemeDir);
        const resolvedDesignSystemPath = path.resolve(designSystemPath);
        debug(
          'Resolved paths - project: %s, IA: %s, design: %s',
          resolvedProjectDir,
          resolvedIASchemeDir,
          resolvedDesignSystemPath,
        );

        output.info(`Implementing client application`);
        output.info(`Project directory: ${resolvedProjectDir}`);
        output.info(`IA schema directory: ${resolvedIASchemeDir}`);
        output.info(`Design system: ${resolvedDesignSystemPath}`);

        // Import the handler
        debug('Importing frontend-implementation handler');
        const { handleImplementClientCommand } = await import('@auto-engineer/frontend-implementation');
        debug('Handler imported successfully');

        const implementCommand = {
          type: 'ImplementClient' as const,
          data: {
            projectDir: resolvedProjectDir,
            iaSchemeDir: resolvedIASchemeDir,
            designSystemPath: resolvedDesignSystemPath,
          },
          timestamp: new Date(),
          requestId: `implement-client-${Date.now()}`,
        };

        debug('Calling handleImplementClientCommand with request ID: %s', implementCommand.requestId);
        const result = await handleImplementClientCommand(implementCommand);
        debug('Command handler returned result type: %s', result.type);

        if (result.type === 'ClientImplemented') {
          debug('Client implementation successful');
          output.success(`✅ Client implemented successfully at: ${result.data.projectDir}`);
          await analytics.track({ command: 'implement:client', success: true });
          debug('Success analytics tracked');
        } else {
          debug('Client implementation failed: %s', result.data.error);
          output.error(`❌ Failed to implement client: ${result.data.error}`);
          await analytics.track({ command: 'implement:client', success: false, errorCode: result.data.error });
          debug('Failure analytics tracked, exiting with code 1');
          process.exit(1);
        }
      } catch (error) {
        debug('Exception caught: %O', error);
        await analytics.track({ command: 'implement:client', success: false, errorCode: 'exception' });
        handleError(error instanceof Error ? error : new Error(String(error)));
        debug('Error handled, exiting with code 1');
        process.exit(1);
      }
    });

  return command;
};
