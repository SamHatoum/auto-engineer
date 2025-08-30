// Example auto.config.ts file for Auto Engineer CLI plugin system
// Copy this file to your project root and rename to auto.config.ts

export default {
  // List of Auto Engineer packages to load as plugins
  plugins: [
    '@auto-engineer/flow',
    '@auto-engineer/server-generator-apollo-emmett',
    '@auto-engineer/server-implementer',
    '@auto-engineer/frontend-implementer',
    '@auto-engineer/design-system-importer',
    '@auto-engineer/information-architect',
    '@auto-engineer/server-checks',
    '@auto-engineer/frontend-checks',
    '@auto-engineer/frontend-generator-react-graphql',
  ],

  // Optional: Override command aliases when there are conflicts between packages
  // The format is: 'command-alias': '@package-name-that-should-handle-it'
  // Each package can expose multiple commands, so we resolve conflicts per command
  aliases: {
    // Example: If multiple packages register 'check:types':
    // 'check:types': '@auto-engineer/server-checks',
    // Example: If both frontend-generator-react-graphql and another package register 'generate:client':
    // 'generate:client': '@auto-engineer/frontend-generator-react-graphql',
  },
};
