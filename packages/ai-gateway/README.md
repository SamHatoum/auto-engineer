# @auto-engineer/ai-gateway

AI Gateway plugin for the Auto Engineer CLI that provides a unified interface for interacting with multiple AI providers and managing AI-driven workflows. This plugin enables seamless integration with various AI models for text generation, structured data generation, and tool execution in event-driven architectures.

## Installation

This is a plugin for the Auto Engineer CLI. Install both the CLI and this plugin:

```bash
npm install -g @auto-engineer/cli
npm install @auto-engineer/ai-gateway
```

## Configuration

Add this plugin to your `auto.config.ts`:

```typescript
export default {
  plugins: [
    '@auto-engineer/ai-gateway',
    // ... other plugins
  ],
};
```

### Environment Variables

Configure AI providers by setting environment variables in a `.env` file or your environment:

```bash
# At least one of these is required
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-google-key
XAI_API_KEY=your-xai-key

# Optional: Set default provider and model
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4o-mini
```

## Commands

This plugin provides the following commands:

- `ai:generate-text` - Generate text using AI models
- `ai:stream-text` - Stream text output from AI models
- `ai:generate-structured` - Generate structured data with schema validation
- `ai:stream-structured` - Stream structured data with schema validation

## What does this plugin do?

The AI Gateway plugin provides a unified interface for interacting with multiple AI providers (OpenAI, Anthropic, Google, XAI) and integrates with the Auto Engineer ecosystem for AI-driven code generation and tool execution. It supports text generation, structured data generation, and streaming capabilities with robust error handling and debugging.

## Key Features

### Multi-Provider Support

- Supports OpenAI, Anthropic, Google, and XAI providers
- Automatic provider selection based on environment configuration
- Fallback to available providers if default is not configured
- Configurable default models per provider

### Text Generation

- Generate text with customizable parameters (temperature, max tokens)
- Supports both synchronous and streaming text generation
- Integrates with registered tools for enhanced functionality
- Image-based text generation for supported providers (OpenAI, XAI)

### Structured Data Generation

- Generates structured data with Zod schema validation
- Retry logic for schema validation failures
- Enhanced error prompts for iterative refinement
- Streaming support for partial object updates

### Tool Integration

- Registers and executes custom tools via the Model Context Protocol (MCP) server
- Supports batch tool registration
- Validates tool inputs with Zod schemas
- Integrates tools with AI-driven workflows

### Debugging Support

Comprehensive debug logging with namespaces:

- `ai-gateway`: General operations
- `ai-gateway:call`: AI call operations
- `ai-gateway:provider`: Provider selection and initialization
- `ai-gateway:error`: Error handling
- `ai-gateway:stream`: Streaming operations
- `ai-gateway:result`: Result processing

Enable debugging:

```bash
DEBUG=ai-gateway:* npm run dev
```

See [DEBUG.md](./DEBUG.md) for detailed debugging instructions.

## Usage

### Generating Text

```typescript
import { generateTextWithAI } from '@auto-engineer/ai-gateway';

const result = await generateTextWithAI('Write a poem about the stars', {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 500,
});

console.log(result);
```

### Streaming Text

```typescript
import { generateTextStreamingWithAI } from '@auto-engineer/ai-gateway';

const result = await generateTextStreamingWithAI('Explain quantum computing', {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  streamCallback: (token) => process.stdout.write(token),
});

console.log(result); // Full collected result
```

### Generating Structured Data

```typescript
import { generateStructuredDataWithAI, z } from '@auto-engineer/ai-gateway';

const schema = z.object({
  title: z.string(),
  description: z.string(),
  completed: z.boolean(),
});

const result = await generateStructuredDataWithAI('Generate a todo item', {
  provider: 'xai',
  schema,
  schemaName: 'TodoItem',
  schemaDescription: 'A todo item with title, description, and completion status',
});

console.log(result); // { title: string, description: string, completed: boolean }
```

### Tool Registration and Execution

```typescript
import { registerTool, startServer } from '@auto-engineer/ai-gateway';
import { z } from 'zod';

registerTool(
  'greet',
  {
    title: 'Greeting Tool',
    description: 'Greets users in different languages',
    inputSchema: {
      name: z.string().min(1, 'Name is required'),
      language: z.enum(['en', 'es', 'fr', 'de']).optional().default('en'),
    },
  },
  async ({ name, language = 'en' }) => {
    const greetings = {
      en: `Hello, ${name}!`,
      es: `¡Hola, ${name}!`,
      fr: `Bonjour, ${name}!`,
      de: `Hallo, ${name}!`,
    };
    return { content: [{ type: 'text', text: greetings[language] }] };
  },
);

await startServer();
```

## Configuration Options

Customize behavior through `auto.config.ts`:

```typescript
export default {
  plugins: [
    [
      '@auto-engineer/ai-gateway',
      {
        // Default AI provider
        defaultProvider: 'openai',

        // Default model per provider
        defaultModels: {
          openai: 'gpt-4o-mini',
          anthropic: 'claude-sonnet-4-20250514',
          google: 'gemini-2.5-pro',
          xai: 'grok-4',
        },

        // Generation parameters
        temperature: 0.7,
        maxTokens: 1000,

        // Tool integration
        includeToolsByDefault: true,
      },
    ],
  ],
};
```

## Integration with Auto Engineer Ecosystem

Works with other Auto Engineer plugins:

- **@auto-engineer/server-implementer**: Uses AI Gateway for AI-driven server code implementation
- **@auto-engineer/frontend-implementer**: Powers AI-driven frontend code generation
- **@auto-engineer/flow**: Integrates with Flow specifications for AI-driven workflows
- **@auto-engineer/server-generator-apollo-emmett**: Enhances server generation with AI capabilities
- **@auto-engineer/frontend-generator-react-graphql**: Supports AI-driven frontend scaffolding

## Project Structure

```
ai-gateway/
├── src/
│   ├── config.ts          # AI provider configuration
│   ├── index.ts           # Main API and provider logic
│   ├── mcp-server.ts      # Model Context Protocol server for tool management
│   └── example-use.ts     # Example tool implementations
├── DEBUG.md               # Debugging instructions
├── CHANGELOG.md           # Version history
├── package.json
└── tsconfig.json
```

## Quality Assurance

- **Type Safety**: Full TypeScript support with Zod schema validation
- **Error Handling**: Comprehensive error detection and logging
- **Testing**: Unit tests with Vitest for core functionality
- **Linting**: ESLint and Prettier for code quality
- **Debugging**: Detailed logging with `debug` library

## Advanced Features

### Retry Logic

- Automatic retries for schema validation failures
- Enhanced error prompts for better AI responses
- Configurable retry limits

### Streaming Support

- Real-time text streaming with callbacks
- Partial object streaming for structured data
- Efficient chunk handling for large responses

### Provider Flexibility

- Dynamic provider selection based on availability
- Environment-based configuration
- Support for provider-specific error handling

## Getting Started

1. Install the plugin (see Installation above)
2. Configure environment variables for your AI providers
3. Add the plugin to `auto.config.ts`
4. Use the provided commands or import functions for AI operations

Example workflow:

```bash
# Install dependencies
npm install @auto-engineer/ai-gateway

# Generate text
auto ai:generate-text --prompt="Write a story" --provider=openai

# Generate structured data
auto ai:generate-structured --prompt="Create a user profile" --schema=userSchema.json
```

## Debugging

Enable detailed logging for troubleshooting:

```bash
DEBUG=ai-gateway:* npm run dev
```

See [DEBUG.md](./DEBUG.md) for more details.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.
