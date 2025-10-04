import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import { importDesignSystemComponentsFromFigma, ImportStrategy, type FilterFunctionType } from '../index';
import { FilterLoader } from '../utils/FilterLoader';
import createDebug from 'debug';

const debug = createDebug('auto:design-system-importer:command');
const debugFilter = createDebug('auto:design-system-importer:command:filter');
const debugHandler = createDebug('auto:design-system-importer:command:handler');
const debugResult = createDebug('auto:design-system-importer:command:result');

export type ImportDesignSystemCommand = Command<
  'ImportDesignSystem',
  {
    outputDir: string;
    strategy?: keyof typeof ImportStrategy;
    filterPath?: string;
  }
>;

export type DesignSystemImportedEvent = Event<
  'ImportDesignSystemCompleted',
  {
    outputDir: string;
  }
>;

export type DesignSystemImportFailedEvent = Event<
  'ImportDesignSystemFailed',
  {
    error: string;
    outputDir: string;
  }
>;

export const commandHandler = defineCommandHandler<
  ImportDesignSystemCommand,
  (command: ImportDesignSystemCommand) => Promise<DesignSystemImportedEvent | DesignSystemImportFailedEvent>
>({
  name: 'ImportDesignSystem',
  alias: 'import:design-system',
  description: 'Import Figma design system',
  category: 'import',
  icon: 'palette',
  fields: {
    outputDir: {
      description: 'Source directory for design system',
      required: true,
    },
    strategy: {
      description: 'Import mode (e.g., WITH_COMPONENT_SETS)',
    },
    filterPath: {
      description: 'Optional filter file',
    },
  },
  examples: [
    '$ auto import:design-system --output-dir=./.context --strategy=WITH_COMPONENT_SETS --filter-path=./shadcn-filter.ts',
  ],
  events: ['ImportDesignSystemCompleted', 'ImportDesignSystemFailed'],
  handle: async (command: Command): Promise<DesignSystemImportedEvent | DesignSystemImportFailedEvent> => {
    const typedCommand = command as ImportDesignSystemCommand;
    debug('CommandHandler executing for ImportDesignSystem');
    const result = await handleImportDesignSystemCommandInternal(typedCommand);
    if (result.type === 'ImportDesignSystemCompleted') {
      debug('Command handler completed: success');
      debugResult('Design system imported successfully to %s', result.data.outputDir);
    } else {
      debug('Command handler completed: failure - %s', result.data.error);
      debugResult('Failed: %s', result.data.error);
    }
    return result;
  },
});

// Handler
async function loadFilterFunction(filterPath?: string): Promise<FilterFunctionType | undefined> {
  if (typeof filterPath !== 'string' || filterPath.trim().length === 0) {
    debugFilter('No filter path provided, proceeding without custom filter');
    return undefined;
  }

  debugFilter('Loading custom filter from: %s', filterPath);
  let loader: FilterLoader | undefined;
  try {
    loader = new FilterLoader();
    debugFilter('FilterLoader instance created');
    const filterFn = await loader.loadFilter(filterPath);
    debugFilter('Filter function loaded successfully');
    return filterFn;
  } catch (e) {
    debugFilter('ERROR: Failed to load filter from %s: %O', filterPath, e);
    debugFilter('WARNING: Could not import filter from %s. Skipping custom filter. Error: %O', filterPath, e);
    return undefined;
  } finally {
    if (loader) {
      debugFilter('Cleaning up FilterLoader');
      loader.cleanup();
    }
  }
}

function createSuccessEvent(command: ImportDesignSystemCommand, outputDir: string): DesignSystemImportedEvent {
  const successEvent: DesignSystemImportedEvent = {
    type: 'ImportDesignSystemCompleted',
    data: { outputDir },
    timestamp: new Date(),
    requestId: command.requestId,
    correlationId: command.correlationId,
  };
  debugResult('Returning success event: DesignSystemImported');
  debugResult('  Output directory: %s', outputDir);
  return successEvent;
}

function createFailureEvent(
  command: ImportDesignSystemCommand,
  error: unknown,
  outputDir: string,
): DesignSystemImportFailedEvent {
  const errorMessage = error instanceof Error ? error.message : String(error);
  debugHandler('ERROR: Design system import failed: %O', error);
  debugResult('Error message: %s', errorMessage);

  const failureEvent: DesignSystemImportFailedEvent = {
    type: 'ImportDesignSystemFailed',
    data: { error: errorMessage, outputDir },
    timestamp: new Date(),
    requestId: command.requestId,
    correlationId: command.correlationId,
  };
  debugResult('Returning failure event: ImportDesignSystemFailed');
  debugResult('  Error: %s', errorMessage);
  debugResult('  Output directory: %s', outputDir);
  return failureEvent;
}

// Handler
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

    const filterFn = await loadFilterFunction(filterPath);

    debugHandler('Calling importDesignSystemComponentsFromFigma...');
    await importDesignSystemComponentsFromFigma(outputDir, resolvedStrategy, filterFn);
    debugHandler('Import completed successfully');
    debugHandler('Design system files processed to %s', outputDir);

    return createSuccessEvent(command, outputDir);
  } catch (error) {
    return createFailureEvent(command, error, outputDir);
  }
}

// Default export is the command handler
export default commandHandler;
