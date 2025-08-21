import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
import * as path from 'path';

const allowedStrategies = ['WITH_COMPONENTS', 'WITH_COMPONENT_SETS', 'WITH_ALL_FIGMA_INSTANCES'] as const;

type StrategyFlag = (typeof allowedStrategies)[number];

export const createImportDesignSystemCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('import:design-system');

  command
    .description('Import design system documentation and preferences')
    .argument('<outputDir>', 'Output directory to copy design system files to')
    .argument(
      '[strategy]',
      'Import strategy: WITH_COMPONENTS | WITH_COMPONENT_SETS | WITH_ALL_FIGMA_INSTANCES',
      'WITH_COMPONENT_SETS',
    )
    .argument('[filterPath]', 'Path to a .ts file exporting a named function "filter"')
    .action(async (outputDir: string, strategy?: StrategyFlag, filterPath?: string) => {
      try {
        await analytics.track({ command: 'import:design-system:start', success: true });

        // Resolve paths
        const resolvedOutputDir = path.resolve(outputDir);

        output.info(`Output directory: ${resolvedOutputDir}`);

        const chosenStrategy = strategy ?? 'WITH_COMPONENT_SETS';
        if (!allowedStrategies.includes(chosenStrategy)) {
          output.error(`Invalid strategy: ${String(strategy)}. Valid values are: ${allowedStrategies.join(', ')}`);
          process.exit(1);
        }
        output.info(`Using strategy: ${chosenStrategy}`);

        let resolvedFilterPath: string | undefined;
        if (typeof filterPath === 'string' && filterPath.trim().length > 0) {
          resolvedFilterPath = path.resolve(filterPath);
          output.info(`Using custom filter from: ${resolvedFilterPath}`);
        }

        // Import the handler
        const { handleImportDesignSystemCommand } = await import('@auto-engineer/design-system-importer');

        const importCommand = {
          type: 'ImportDesignSystem' as const,
          data: {
            outputDir: resolvedOutputDir,
            strategy: chosenStrategy,
            filterPath: resolvedFilterPath,
          },
          timestamp: new Date(),
          requestId: `import-design-system-${Date.now()}`,
        };

        const result = await handleImportDesignSystemCommand(importCommand);

        if (result.type === 'DesignSystemImported') {
          output.success(`✅ Design system imported successfully to: ${result.data.outputDir}`);
          await analytics.track({ command: 'import:design-system', success: true });
        } else {
          output.error(`❌ Failed to import design system: ${result.data.error}`);
          await analytics.track({ command: 'import:design-system', success: false, errorCode: result.data.error });
          process.exit(1);
        }
      } catch (error) {
        await analytics.track({ command: 'import:design-system', success: false, errorCode: 'exception' });
        handleError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
};
