# Installation

This guide covers the steps to install Auto Engineer and set up the necessary prerequisites.

## Prerequisites

Before installing Auto Engineer, ensure you have the following:

- **Node.js**: Version 20.0.0 or higher
- **pnpm**: Version 8.15.4 or higher
- **AI Provider API Key**: At least one of the following:
  - Anthropic Claude (recommended)
  - OpenAI
  - Google Gemini
  - X.AI Grok

## Installation Steps

Auto Engineer uses a plugin-based architecture, allowing you to install only the components you need. Follow these steps to set up a new project:

1. **Install the Auto Engineer CLI globally**: \`\`\`bash pnpm install -g @auto-engineer/cli@latest \`\`\`

2. **Create a new project directory**: \`\`\`bash mkdir my-app && cd my-app \`\`\`

3. **Install required plugins**: For a typical setup, install the core plugins: \`\`\`bash pnpm install @auto-engineer/flow @auto-engineer/server-generator-apollo-emmett \`\`\` To include additional functionality, such as frontend generation, install: \`\`\`bash pnpm install @auto-engineer/frontend-generator-react-graphql @auto-engineer/server-implementer \`\`\`

4. **Configure API keys**: Create a `.env` file in your project root and add your API keys: \`\`\`bash echo "ANTHROPIC_API_KEY=your-key-here" &gt; .env \`\`\`

## Next Steps

After installation, configure your plugins in an `auto.config.ts` file. See Configuration Basics for details. To create your first app, follow the Quickstart Guide.
