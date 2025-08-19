import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
import * as path from 'path';

export const createImportDesignSystemCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('import:design-system');

  command
    .description('Import design system documentation and preferences')
    .argument('<inputDir>', 'Input directory containing design system files')
    .argument('<outputDir>', 'Output directory to copy design system files to')
    .action(async (inputDir: string, outputDir: string) => {
      try {
        await analytics.track({ command: 'import:design-system:start', success: true });

        // Resolve paths
        const resolvedInputDir = path.resolve(inputDir);
        const resolvedOutputDir = path.resolve(outputDir);

        output.info(`Importing design system from: ${resolvedInputDir}`);
        output.info(`Output directory: ${resolvedOutputDir}`);

        // Import the handler
        const { handleImportDesignSystemCommand } = await import('@auto-engineer/design-system-importer');

        const importCommand = {
          type: 'ImportDesignSystem' as const,
          data: {
            inputDir: resolvedInputDir,
            outputDir: resolvedOutputDir,
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
