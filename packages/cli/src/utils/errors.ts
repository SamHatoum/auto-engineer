import chalk from 'chalk';

export interface CLIError extends Error {
  code: string;
  exitCode: number;
}

export class ValidationError extends Error implements CLIError {
  code: string;
  exitCode: number;

  constructor(message: string, code: string = 'E4001', exitCode: number = 1) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

export class ConfigurationError extends Error implements CLIError {
  code: string;
  exitCode: number;

  constructor(message: string, code: string = 'E4002', exitCode: number = 1) {
    super(message);
    this.name = 'ConfigurationError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

export class RuntimeError extends Error implements CLIError {
  code: string;
  exitCode: number;

  constructor(message: string, code: string = 'E5001', exitCode: number = 1) {
    super(message);
    this.name = 'RuntimeError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

const getErrorDetails = (error: Error | CLIError): { errorCode: string; exitCode: number } => {
  const isCLIError = 'code' in error && 'exitCode' in error;
  const cliError = error as CLIError;

  return {
    errorCode: isCLIError ? cliError.code : 'E9999',
    exitCode: isCLIError ? cliError.exitCode : 1,
  };
};

const logErrorStack = (error: Error): void => {
  const isDebugMode = process.env.DEBUG === 'auto-engineer';
  if (isDebugMode && error.stack != null && error.stack.length > 0) {
    console.error(chalk.gray('Stack trace:'));
    console.error(chalk.gray(error.stack));
  }
};

export const handleError = (error: Error | CLIError): never => {
  const { errorCode, exitCode } = getErrorDetails(error);

  console.error(chalk.red(`Error (${errorCode}): ${error.message}`));

  logErrorStack(error);

  process.exit(exitCode);
};

export const createError = (message: string, code: string, exitCode: number = 1): CLIError => {
  return new ValidationError(message, code, exitCode);
};
