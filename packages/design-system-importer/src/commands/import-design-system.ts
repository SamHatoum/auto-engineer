import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { promises as fs } from 'fs';
import { importDesignSystemComponentsFromFigma, ImportStrategy } from '../index';

export type ImportDesignSystemCommand = Command<
  'ImportDesignSystem',
  {
    inputDir: string;
    outputDir: string;
    strategy?: keyof typeof ImportStrategy;
  }
>;

export type DesignSystemImportedEvent = Event<
  'DesignSystemImported',
  {
    inputDir: string;
    outputDir: string;
  }
>;

export type DesignSystemImportFailedEvent = Event<
  'DesignSystemImportFailed',
  {
    error: string;
    inputDir: string;
    outputDir: string;
  }
>;

// Handler
export async function handleImportDesignSystemCommand(
  command: ImportDesignSystemCommand,
): Promise<DesignSystemImportedEvent | DesignSystemImportFailedEvent> {
  const { inputDir, outputDir, strategy } = command.data;

  try {
    // Check if input directory exists
    const inputExists = await fs
      .access(inputDir)
      .then(() => true)
      .catch(() => false);

    if (!inputExists) {
      // Input directory doesn't exist - this is likely an error
      return {
        type: 'DesignSystemImportFailed',
        data: {
          error: `Input directory does not exist: ${inputDir}`,
          inputDir,
          outputDir,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    const resolvedStrategy = strategy ? ImportStrategy[strategy] : ImportStrategy.WITH_COMPONENT_SETS;

    await importDesignSystemComponentsFromFigma(outputDir, resolvedStrategy);
    console.log(`Design system files processed from ${inputDir} to ${outputDir}`);

    return {
      type: 'DesignSystemImported',
      data: {
        inputDir,
        outputDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error importing design system:', error);

    return {
      type: 'DesignSystemImportFailed',
      data: {
        error: errorMessage,
        inputDir,
        outputDir,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const importDesignSystemCommandHandler: CommandHandler<ImportDesignSystemCommand> = {
  name: 'ImportDesignSystem',
  handle: async (command: ImportDesignSystemCommand): Promise<void> => {
    const result = await handleImportDesignSystemCommand(command);
    if (result.type === 'DesignSystemImported') {
      console.log('Design system imported successfully');
    } else {
      console.error(`Failed: ${result.data.error}`);
    }
  },
};
