# Flowlang Agent

A multi-provider AI agent built with the [AI SDK](https://ai-sdk.dev/) that supports OpenAI, Anthropic Claude, and Google Gemini.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure your API keys by setting environment variables:

```bash
# OpenAI API Key (https://platform.openai.com/api-keys)
export OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (https://console.anthropic.com/)
export ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google AI API Key (https://makersuite.google.com/app/apikey)
export GOOGLE_API_KEY=your_google_api_key_here
```

**Note**: You only need to set the API keys for the providers you want to use. At least one provider must be configured.

## Usage

```typescript
import { FlowlangAgent } from '@auto-engineer/flowlang-agent';

// Create an agent with default settings
const agent = new FlowlangAgent();

// Generate text with default provider
const response = await agent.generateText('Explain what is Flowlang in one sentence.');
console.log(response);

// Use a specific provider
const claudeResponse = await agent.generateText('Write a haiku about programming.', {
  provider: 'anthropic'
});

// Stream text
for await (const chunk of agent.streamText('Tell me a story.')) {
  process.stdout.write(chunk);
}

// Compare responses from multiple providers
const multiResponse = await agent.generateWithMultipleProviders(
  'What is the best programming language?',
  ['openai', 'anthropic', 'google']
);

// Check available providers
console.log('Available providers:', agent.getAvailableProviders());
```

## Configuration Options

```typescript
interface AIAgentOptions {
  provider?: 'openai' | 'anthropic' | 'google';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### Default Models
- **OpenAI**: `gpt-4o-mini`
- **Anthropic**: `claude-3-haiku-20240307`
- **Google**: `gemini-1.5-flash`

## Example

Run the example function to see the agent in action:

```typescript
import { example } from '@auto-engineer/flowlang-agent';

await example();
```

This will:
1. Show available providers
2. Generate text with the default provider
3. Stream a response
4. Compare responses from multiple providers
