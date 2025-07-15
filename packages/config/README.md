# @auto-engineer/config

Centralized configuration package for the auto-engineer workspace.

## Usage

```typescript
import { config, env } from '@auto-engineer/config';

// Access environment variables
console.log(env.NODE_ENV);
console.log(env.OPENAI_API_KEY);

// Check if config loaded successfully
if (config.isLoaded) {
  console.log('Environment loaded from:', config.envPath);
}
```

## Environment File Location

The package looks for `.env` file in the workspace root directory.

## Features

- Automatic .env file loading on import
- Typed environment variable access
- Error handling for missing .env files
