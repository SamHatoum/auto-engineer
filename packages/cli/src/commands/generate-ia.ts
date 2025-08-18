import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';
import * as path from 'path';

export const createGenerateIACommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('generate:ia');

  command
    .description('Generate Information Architecture schema from flow files')
    .argument('<outputDir>', 'Output directory for the IA schema')
    .argument('[flowFiles...]', 'Flow files to process')
    .action(async (outputDir: string, flowFiles: string[]) => {
      try {
        await analytics.track({ command: 'generate:ia:start', success: true });

        if (flowFiles.length === 0) {
          output.error('❌ No flow files provided');
          process.exit(1);
        }

        // Resolve paths
        const resolvedOutputDir = path.resolve(outputDir);
        const resolvedFlowFiles = flowFiles.map((f) => path.resolve(f));

        output.info(`Generating IA schema from ${flowFiles.length} flow file(s)`);
        output.info(`Output directory: ${resolvedOutputDir}`);

        // Import the handler
        const { handleGenerateIACommand } = await import('@auto-engineer/information-architect');

        const generateCommand = {
          type: 'GenerateIA' as const,
          data: {
            outputDir: resolvedOutputDir,
            flowFiles: resolvedFlowFiles,
          },
          timestamp: new Date(),
          requestId: `generate-ia-${Date.now()}`,
        };

        const result = await handleGenerateIACommand(generateCommand);

        if (result.type === 'IAGenerated') {
          output.success(`✅ IA schema generated at: ${result.data.outputPath}`);
          await analytics.track({ command: 'generate:ia', success: true });
        } else {
          output.error(`❌ Failed to generate IA schema: ${result.data.error}`);
          await analytics.track({ command: 'generate:ia', success: false, errorCode: result.data.error });
          process.exit(1);
        }
      } catch (error) {
        await analytics.track({ command: 'generate:ia', success: false, errorCode: 'exception' });
        handleError(error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
};
