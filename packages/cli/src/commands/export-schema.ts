import { Command } from 'commander';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';
import { Analytics } from '../utils/analytics';

export const createExportSchemaCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);

  const command = new Command('export:schema');

  command
    .description('Export flow schema to .context/schema.json')
    .option('--directory <path>', 'Target directory (defaults to current directory)')
    .action(async (options: { directory?: string }) => {
      try {
        await analytics.track({ command: 'export:schema:start', success: true });

        const directory = options.directory ?? process.cwd();

        output.info(`Exporting flow schema from ${directory}/flows...`);

        // Import dynamically to avoid TypeScript module resolution issues
        const { handleExportSchemaCommand } = await import('@auto-engineer/flowlang/commands/export-schema');

        const exportCommand = {
          type: 'ExportSchema' as const,
          data: {
            directory,
          },
          timestamp: new Date(),
          requestId: `export-schema-${Date.now()}`,
        };

        // TODO use the bus
        const result = await handleExportSchemaCommand(exportCommand);

        if (result.type === 'SchemaExported') {
          output.success(`✅ Flow schema exported successfully!`);
          output.info(`Schema written to: ${result.data.outputPath}`);

          await analytics.track({ command: 'export:schema', success: true });
        } else {
          output.error(`❌ Failed to export schema: ${result.data.error}`);
          await analytics.track({ command: 'export:schema', success: false, errorCode: result.data.error });
          process.exit(1);
        }
      } catch (error) {
        await analytics.track({
          command: 'export:schema',
          success: false,
          errorCode: error instanceof Error ? error.message : String(error),
        });
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    });

  return command;
};
