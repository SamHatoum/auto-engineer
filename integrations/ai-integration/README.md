# AI Integration Package

A lightweight package for integrating with various AI providers including OpenAI, Anthropic, Google, and xAI.

## Features

- Support for multiple AI providers (OpenAI, Anthropic, Google, xAI)
- Text generation with configurable parameters
- Streaming text generation
- Type-safe provider selection
- Configuration management and validation

## Usage

```typescript
import {
  generateTextWithAI,
  streamTextWithAI,
  loadConfig,
  validateConfig,
  getAvailableProviders,
  type AIProvider,
} from '@auto-engineer/ai-integration';

// Load and validate configuration
const config = loadConfig();
validateConfig(config);

// Get available providers
const providers = getAvailableProviders();
console.log('Available providers:', providers);

// Generate text with a specific provider
const response = await generateTextWithAI("What's the weather like?", 'openai', { temperature: 0.7, maxTokens: 1000 });

// Stream text with a specific provider
for await (const chunk of streamTextWithAI('Tell me a story', 'anthropic', { temperature: 0.8 })) {
  console.log(chunk);
}
```

## API

### `generateTextWithAI(prompt, provider, options?)`

Generates text using the specified AI provider.

### `streamTextWithAI(prompt, provider, options?)`

Streams text generation using the specified AI provider.

### `loadConfig()`

Loads AI provider configuration from environment variables.

### `validateConfig(config)`

Validates that at least one AI provider is configured.

### `getAvailableProviders()`

Returns an array of available AI providers based on configured API keys.

### Types

- `AIProvider`: 'openai' | 'anthropic' | 'google' | 'xai'
- `AIOptions`: Configuration options for AI requests
- `AIConfig`: Configuration interface for AI providers
