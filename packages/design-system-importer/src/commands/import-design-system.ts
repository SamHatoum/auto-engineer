import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { importDesignSystemComponentsFromFigma, ImportStrategy, type FilterFunctionType } from '../index';
import { FilterLoader } from '../utils/FilterLoader';
import createDebug from 'debug';

const debug = createDebug('design-system-importer:command');
const debugFilter = createDebug('design-system-importer:command:filter');
const debugHandler = createDebug('design-system-importer:command:handler');
const debugResult = createDebug('design-system-importer:command:result');

export type ImportDesignSystemCommand = Command<
  'ImportDesignSystem',
  {
    outputDir: string;
    strategy?: keyof typeof ImportStrategy;
    filterPath?: string;
  }
>;

export type DesignSystemImportedEvent = Event<
  'DesignSystemImported',
  {
    outputDir: string;
  }
>;

export type DesignSystemImportFailedEvent = Event<
  'DesignSystemImportFailed',
  {
    error: string;
    outputDir: string;
  }
>;

// Handler
// eslint-disable-next-line complexity
async function handleImportDesignSystemCommandInternal(
  command: ImportDesignSystemCommand,
): Promise<DesignSystemImportedEvent | DesignSystemImportFailedEvent> {
  const { outputDir, strategy, filterPath } = command.data;

  debug('Handling ImportDesignSystemCommand');
  debug('  Output directory: %s', outputDir);
  debug('  Strategy: %s', strategy ?? 'default');
  debug('  Filter path: %s', filterPath ?? 'none');
  debug('  Request ID: %s', command.requestId);
  debug('  Correlation ID: %s', command.correlationId ?? 'none');

  try {
    const resolvedStrategy = strategy ? ImportStrategy[strategy] : ImportStrategy.WITH_COMPONENT_SETS;
    debugHandler('Resolved strategy: %s', resolvedStrategy);

    let filterFn: FilterFunctionType | undefined;
    let loader: FilterLoader | undefined;
    if (typeof filterPath === 'string' && filterPath.trim().length > 0) {
      debugFilter('Loading custom filter from: %s', filterPath);
      try {
        loader = new FilterLoader();
        debugFilter('FilterLoader instance created');
        filterFn = await loader.loadFilter(filterPath);
        debugFilter('Filter function loaded successfully');
      } catch (e) {
        debugFilter('ERROR: Failed to load filter from %s: %O', filterPath, e);
        console.warn(`Could not import filter from ${filterPath}. Skipping custom filter.`, e);
      } finally {
        if (loader) {
          debugFilter('Cleaning up FilterLoader');
          loader.cleanup();
        }
      }
    } else {
      debugFilter('No filter path provided, proceeding without custom filter');
    }

    debugHandler('Calling importDesignSystemComponentsFromFigma...');
    await importDesignSystemComponentsFromFigma(outputDir, resolvedStrategy, filterFn);
    debugHandler('Import completed successfully');
    console.log(`Design system files processed to ${outputDir}`);

    const successEvent: DesignSystemImportedEvent = {
      type: 'DesignSystemImported',
      data: {
        outputDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
    debugResult('Returning success event: DesignSystemImported');
    debugResult('  Output directory: %s', outputDir);
    return successEvent;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugHandler('ERROR: Design system import failed: %O', error);
    debugResult('Error message: %s', errorMessage);
    console.error('Error importing design system:', error);

    const failureEvent: DesignSystemImportFailedEvent = {
      type: 'DesignSystemImportFailed',
      data: {
        error: errorMessage,
        outputDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
    debugResult('Returning failure event: DesignSystemImportFailed');
    debugResult('  Error: %s', errorMessage);
    debugResult('  Output directory: %s', outputDir);
    return failureEvent;
  }
}

export const importDesignSystemCommandHandler: CommandHandler<ImportDesignSystemCommand> = {
  name: 'ImportDesignSystem',
  handle: async (command: ImportDesignSystemCommand): Promise<void> => {
    debug('CommandHandler executing for ImportDesignSystem');
    const result = await handleImportDesignSystemCommandInternal(command);
    if (result.type === 'DesignSystemImported') {
      debug('Command handler completed: success');
      console.log('Design system imported successfully');
    } else {
      debug('Command handler completed: failure - %s', result.data.error);
      console.error(`Failed: ${result.data.error}`);
    }
  },
};

// CLI arguments interface
interface CliArgs {
  _: string[];
  strategy?: 'WITH_COMPONENTS' | 'WITH_COMPONENT_SETS' | 'WITH_ALL_FIGMA_INSTANCES';
  filter?: string;
  [key: string]: unknown;
}

// Type guard to check if it's an ImportDesignSystemCommand
function isImportDesignSystemCommand(obj: unknown): obj is ImportDesignSystemCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'data' in obj &&
    (obj as { type: unknown }).type === 'ImportDesignSystem'
  );
}

// Default export for CLI usage
export default async (commandOrArgs: ImportDesignSystemCommand | CliArgs) => {
  const command = isImportDesignSystemCommand(commandOrArgs)
    ? commandOrArgs
    : {
        type: 'ImportDesignSystem' as const,
        data: {
          outputDir: commandOrArgs._?.[0] ?? '.context/design-system.md',
          strategy: commandOrArgs.strategy,
          filterPath: commandOrArgs.filter,
        },
        timestamp: new Date(),
      };

  const result = await handleImportDesignSystemCommandInternal(command);
  if (result.type === 'DesignSystemImported') {
    console.log('Design system imported successfully');
  } else {
    console.error(`Failed: ${result.data.error}`);
  }
};
