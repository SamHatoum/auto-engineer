export { AIProvider } from '../core/types';
export type {
  CustomProviderConfig,
  AIConfig,
  AIContext,
  AIOptions,
  StructuredAIOptions,
  StreamStructuredAIOptions,
  AIToolValidationError,
  RegisteredToolForAI,
} from '../core/types';

export { DEFAULT_MODELS } from '../core/constants';

export { createAIContext, getModel } from '../core/context';

export {
  generateText,
  streamText,
  generateTextStreaming,
  generateTextWithImage,
  generateStructuredData,
  streamStructuredData,
  generateTextWithTools,
} from '../core/generators';

export { createCustomProvider } from '../core/providers/custom';

export { configureAIProvider } from './config';

export {
  getDefaultAIProvider,
  getDefaultModel,
  getAvailableProviders,
  generateTextWithAI,
  streamTextWithAI,
  generateTextStreamingWithAI,
  generateTextWithImageAI,
  generateStructuredDataWithAI,
  streamStructuredDataWithAI,
  generateTextWithToolsAI,
  resetGlobalContext,
} from './wrappers';

export {
  server as mcpServer,
  registerTool,
  registerTools,
  startServer,
  isServerStarted,
  getRegisteredTools,
  getRegisteredToolsForAI,
  getToolHandler,
  getSchemaByName,
  executeRegisteredTool,
  type ToolHandler,
  type RegisteredTool,
} from './mcp-server';

export { z } from 'zod';
