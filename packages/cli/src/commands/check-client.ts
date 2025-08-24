#!/usr/bin/env node
import { Command } from 'commander';
import createDebug from 'debug';
import { Config } from '../utils/config';
import { Analytics } from '../utils/analytics';

const debug = createDebug('cli:check-client');

export function createCheckClientCommand(config: Config, analytics: Analytics): Command {
  const command = new Command('check:client')
    .description('Run frontend checks on client application')
    .argument('<client-directory>', 'Path to the client directory')
    .option('--skip-browser', 'Skip browser-based checks (console errors)')
    .option('-d, --debug', 'Enable debug output')
    .action(async (clientDirectory: string, options: { skipBrowser?: boolean; debug?: boolean }) => {
      debug('Starting check:client command');
      debug('  Client directory: %s', clientDirectory);
      debug('  Options: %o', options);

      await analytics.track({
        command: 'check:client:start',
        success: true,
      });

      try {
        // Dynamic import to avoid circular dependency issues
        const { handleCheckClientCommand } = await import('@auto-engineer/frontend-checks');

        const command = {
          type: 'CheckClient' as const,
          data: {
            clientDirectory,
            skipBrowserChecks: options.skipBrowser ?? false,
          },
          timestamp: new Date(),
          requestId: `cli-${Date.now()}`,
        };

        debug('Executing check client command');
        const result = await handleCheckClientCommand(command);

        if (result.type === 'ClientChecked') {
          const { tsErrors, buildErrors, consoleErrors, allChecksPassed } = result.data;

          if (allChecksPassed) {
            debug('All checks passed');
            console.log('✅ All frontend checks passed successfully');
            await analytics.track({ command: 'check:client', success: true });
          } else {
            debug('Some checks failed');
            console.log('❌ Frontend checks failed:');
            if (tsErrors > 0) console.log(`   - ${tsErrors} TypeScript errors`);
            if (buildErrors > 0) console.log(`   - ${buildErrors} build errors`);
            if (consoleErrors > 0) console.log(`   - ${consoleErrors} console errors`);
            await analytics.track({ command: 'check:client', success: false, errorCode: 'checks_failed' });
            process.exit(1);
          }
        } else {
          debug('Check failed: %s', result.data.error);
          console.error(`❌ Frontend checks failed: ${result.data.error}`);
          await analytics.track({ command: 'check:client', success: false, errorCode: result.data.error });
          process.exit(1);
        }
      } catch (error) {
        debug('Command error: %O', error);
        console.error('Frontend checks failed:', error);
        await analytics.track({ command: 'check:client', success: false, errorCode: 'exception' });
        process.exit(1);
      }
    });

  return command;
}
