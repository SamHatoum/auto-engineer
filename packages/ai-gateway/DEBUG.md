# Debug Logging - AI Gateway

This package uses the [debug](https://www.npmjs.com/package/debug) library for conditional logging.

## Available Debug Namespaces

- `ai-gateway` - General gateway operations
- `ai-gateway:call` - AI call operations
- `ai-gateway:provider` - Provider selection and initialization
- `ai-gateway:error` - Error extraction from AI SDK
- `ai-gateway:stream` - Streaming operations
- `ai-gateway:result` - Result handling and processing

## Enabling Debug Output

Set the `DEBUG` environment variable to enable logging:

```bash
# Enable all ai-gateway logging
DEBUG=ai-gateway:* pnpm dev

# Enable specific namespace
DEBUG=ai-gateway:call pnpm dev

# Enable multiple namespaces
DEBUG=ai-gateway:call,ai-gateway:error pnpm dev

# Enable all logging
DEBUG=* pnpm dev
```

## Examples

### Debug AI Calls

```bash
DEBUG=ai-gateway:call pnpm dev
```

Output example:

```
ai-gateway:call Starting AI call
ai-gateway:call   Model: claude-3-5-sonnet-20241022
ai-gateway:call   Max tokens: 4096
ai-gateway:call   Temperature: 0.7
ai-gateway:call   Messages: 3
ai-gateway:call   System prompt length: 1234
ai-gateway:call   User prompt length: 567
ai-gateway:call Initiating generateText call
ai-gateway:call AI call completed successfully
ai-gateway:call   Response length: 2345 characters
ai-gateway:call   Usage: 890 prompt tokens, 456 completion tokens
```

### Debug Provider Selection

```bash
DEBUG=ai-gateway:provider pnpm dev
```

Output example:

```
ai-gateway:provider Selecting AI provider for model: claude-3-5-sonnet
ai-gateway:provider   Provider: anthropic
ai-gateway:provider Creating Anthropic provider
ai-gateway:provider   API key present: yes
ai-gateway:provider   Base URL: https://api.anthropic.com
ai-gateway:provider Provider initialized successfully
ai-gateway:provider Model mapped: claude-3-5-sonnet -> claude-3-5-sonnet-20241022
```

### Debug Error Handling

```bash
DEBUG=ai-gateway:error pnpm dev
```

Output example:

```
ai-gateway:error AI call failed, attempting to extract error details
ai-gateway:error Extracting error from Vercel AI SDK error object
ai-gateway:error   Error has cause property
ai-gateway:error   Cause is APICallError
ai-gateway:error   Status code: 429
ai-gateway:error   Error message: Rate limit exceeded
ai-gateway:error   Headers: { 'retry-after': '60', 'x-ratelimit-remaining': '0' }
ai-gateway:error Extracted error details: 429 - Rate limit exceeded
```

### Debug Streaming Operations

```bash
DEBUG=ai-gateway:stream pnpm dev
```

Output example:

```
ai-gateway:stream Starting streaming AI call
ai-gateway:stream   Model: gpt-4-turbo
ai-gateway:stream   Stream mode: true
ai-gateway:stream Stream initialized
ai-gateway:stream Chunk received: 45 characters
ai-gateway:stream Chunk received: 67 characters
ai-gateway:stream Chunk received: 23 characters
ai-gateway:stream Stream completed
ai-gateway:stream   Total chunks: 15
ai-gateway:stream   Total characters: 2345
```

### Debug Result Processing

```bash
DEBUG=ai-gateway:result pnpm dev
```

Output example:

```
ai-gateway:result Processing AI response
ai-gateway:result   Response type: text
ai-gateway:result   Content length: 2345
ai-gateway:result Extracting usage information
ai-gateway:result   Prompt tokens: 890
ai-gateway:result   Completion tokens: 456
ai-gateway:result   Total tokens: 1346
ai-gateway:result Result processed successfully
```

## Common Use Cases

### Debug Full AI Pipeline

```bash
DEBUG=ai-gateway:* pnpm dev
```

### Debug AI Calls with Errors

```bash
DEBUG=ai-gateway:call,ai-gateway:error pnpm dev
```

### Debug Provider and Streaming

```bash
DEBUG=ai-gateway:provider,ai-gateway:stream pnpm dev
```

### Debug with Other Packages

```bash
DEBUG=ai-gateway:*,frontend-impl:agent:ai pnpm implement:client
```

### Save Debug Output

```bash
DEBUG=ai-gateway:* pnpm dev 2> ai-gateway-debug.log
```

## Provider-Specific Debugging

### Anthropic

```bash
DEBUG=ai-gateway:provider,ai-gateway:call ANTHROPIC_API_KEY=your-key pnpm dev
```

### OpenAI

```bash
DEBUG=ai-gateway:provider,ai-gateway:call OPENAI_API_KEY=your-key pnpm dev
```

### Google AI (Gemini)

```bash
DEBUG=ai-gateway:provider,ai-gateway:call GEMINI_API_KEY=your-key pnpm dev
```

### X.AI (Grok)

```bash
DEBUG=ai-gateway:provider,ai-gateway:call XAI_API_KEY=your-key pnpm dev
```

## Error Debugging

When errors occur, enable error and call namespaces:

```bash
DEBUG=ai-gateway:call,ai-gateway:error pnpm dev
```

Common error patterns:

- Rate limits: Status 429 with retry-after header
- Invalid API key: Status 401
- Model not found: Status 404
- Context length exceeded: Status 400 with specific error message

## Tips

- Monitor token usage with `DEBUG=ai-gateway:result`
- Track provider selection with `DEBUG=ai-gateway:provider`
- Debug streaming issues with `DEBUG=ai-gateway:stream`
- Combine with implementation packages for full trace
- Use `DEBUG=ai-gateway:error` to diagnose API issues
