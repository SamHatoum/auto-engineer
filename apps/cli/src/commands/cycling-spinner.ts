import { Command } from 'commander';
import { Config } from '../utils/config.js';
import { Analytics } from '../utils/analytics.js';
import { runCyclingSpinnerExample } from './cycling-spinner-example.js';

export const createCyclingSpinnerCommand = (config: Config, analytics: Analytics) => {
  const command = new Command('cycling-spinner')
    .description('Demonstrate cycling color spinner with ora and chalk')
    .action(async () => {
      try {
        await runCyclingSpinnerExample();
        await analytics.track({
          command: 'cycling-spinner-example',
          success: true
        });
      } catch (error) {
        await analytics.track({
          command: 'cycling-spinner-example',
          success: false,
          errorCode: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

  return command;
}; 