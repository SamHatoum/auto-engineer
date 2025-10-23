import { AIToolValidationError } from '../types';
import { makeLogger } from './log';

const debugValidation = makeLogger('auto:ai-gateway:validation');

export function getEnhancedPrompt(prompt: string, lastError: AIToolValidationError): string {
  const errorDetails = lastError.zodIssues
    ? JSON.stringify(lastError.zodIssues, null, 2)
    : lastError.validationDetails?.cause?.issues
      ? JSON.stringify(lastError.validationDetails.cause.issues, null, 2)
      : lastError.message;

  debugValidation('Enhancing prompt with validation error details: %o', errorDetails);
  return `${prompt}\n\n⚠️ IMPORTANT: Your previous response failed validation with the following errors:\n${errorDetails}\n\nPlease fix these errors and ensure your response EXACTLY matches the required schema structure.`;
}

export function isSchemaError(error: Error): boolean {
  return (
    error.message.includes('response did not match schema') ||
    error.message.includes('TypeValidationError') ||
    error.name === 'AI_TypeValidationError'
  );
}

export function enhanceValidationError(error: AIToolValidationError): AIToolValidationError {
  const enhancedError = new Error(error.message) as AIToolValidationError;
  Object.assign(enhancedError, error);

  if (error.cause !== undefined || error.issues !== undefined || error.errors !== undefined) {
    enhancedError.validationDetails = {
      cause: error.cause,
      issues: error.issues,
      errors: error.errors,
    };
  }

  if (
    error.message.includes('response did not match schema') &&
    'cause' in error &&
    typeof error.cause === 'object' &&
    error.cause !== null &&
    'issues' in error.cause
  ) {
    enhancedError.zodIssues = error.cause.issues as unknown[];
  }
  return enhancedError;
}

export function handleFailedRequest(
  lastError: AIToolValidationError | undefined,
  maxRetries: number,
  attempt: number,
): { shouldRetry: boolean; enhancedError?: AIToolValidationError } {
  if (!lastError || !isSchemaError(lastError) || attempt >= maxRetries - 1) {
    debugValidation(
      'Not retrying - isLastError: %s, isSchemaError: %s, attempt: %d/%d',
      !!lastError,
      lastError ? isSchemaError(lastError) : false,
      attempt + 1,
      maxRetries,
    );
    return { shouldRetry: false, enhancedError: lastError };
  }

  debugValidation('Schema validation failed on attempt %d/%d, will retry', attempt + 1, maxRetries);
  const enhancedError = enhanceValidationError(lastError);

  return { shouldRetry: true, enhancedError };
}
