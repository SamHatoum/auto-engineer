import { AIProvider } from '../types';
import { makeLogger } from './log';

const debugError = makeLogger('auto:ai-gateway:error');

const ERROR_PATTERNS = [
  {
    patterns: ['rate limit', '429'],
    statusCode: 429,
    icon: '⚠️',
    message: 'RATE LIMIT ERROR detected for %s',
    checkRetryAfter: true,
  },
  {
    patterns: ['401', 'unauthorized'],
    statusCode: 401,
    icon: '🔐',
    message: 'AUTHENTICATION ERROR - Check your %s API key',
  },
  {
    patterns: ['quota', 'credits', 'insufficient'],
    icon: '💳',
    message: 'QUOTA/CREDITS ERROR - Insufficient credits for %s',
  },
  {
    patterns: ['model', 'not found'],
    icon: '🤖',
    message: 'MODEL ERROR - Model might not be available for %s',
  },
  {
    patterns: ['timeout', 'timed out'],
    icon: '⏱️',
    message: 'TIMEOUT ERROR - Request timed out for %s',
  },
  {
    patterns: ['ECONNREFUSED', 'ENOTFOUND', 'network'],
    icon: '🌐',
    message: 'NETWORK ERROR - Connection failed to %s',
  },
];

function checkErrorType(message: string, errorAny: Record<string, unknown>, provider: AIProvider): void {
  for (const errorType of ERROR_PATTERNS) {
    const hasPattern = errorType.patterns.some((pattern) => message.includes(pattern));
    const hasStatusCode = errorType.statusCode !== undefined && errorAny.status === errorType.statusCode;

    if (hasPattern || hasStatusCode) {
      debugError(`${errorType.icon} ${errorType.message}`, provider);

      if (errorType.checkRetryAfter === true && errorAny.retryAfter !== undefined) {
        debugError('Retry after: %s seconds', String(errorAny.retryAfter));
      }
      return;
    }
  }
}

function extractErrorDetails(errorAny: Record<string, unknown>): void {
  if (errorAny.response !== undefined && typeof errorAny.response === 'object' && errorAny.response !== null) {
    const response = errorAny.response as Record<string, unknown>;
    debugError('Response status: %s', String(response.status ?? 'unknown'));
    debugError('Response status text: %s', String(response.statusText ?? 'unknown'));
    if (response.data !== undefined) {
      debugError('Response data: %o', response.data);
    }
  }

  if (errorAny.code !== undefined) {
    debugError('Error code: %s', String(errorAny.code));
  }

  if (errorAny.type !== undefined) {
    debugError('Error type: %s', String(errorAny.type));
  }
}

export function extractAndLogError(error: unknown, provider: AIProvider, operation: string): void {
  debugError('%s failed for provider %s', operation, provider);

  if (error instanceof Error) {
    debugError('Error message: %s', error.message);
    debugError('Error name: %s', error.name);
    debugError('Error stack: %s', error.stack);
    const errorAny = error as unknown as Record<string, unknown>;
    checkErrorType(error.message, errorAny, provider);
    extractErrorDetails(errorAny);
    debugError('Full error object: %O', error);
  } else {
    debugError('Unknown error type: %O', error);
  }
}
