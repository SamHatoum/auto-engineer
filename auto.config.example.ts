// Example auto.config.ts file for Auto Engineer CLI plugin system
// Copy this file to your project root and rename to auto.config.ts

export default {
  // List of Auto Engineer packages to load as plugins
  plugins: [
    '@auto-engineer/flowlang',
    '@auto-engineer/emmett-generator',
    '@auto-engineer/server-implementer',
    '@auto-engineer/frontend-implementation',
    '@auto-engineer/design-system-importer',
    '@auto-engineer/information-architect',
    '@auto-engineer/backend-checks',
    '@auto-engineer/frontend-checks',
    '@auto-engineer/react-graphql-generator',
  ],

  // Optional: Override command aliases when there are conflicts between packages
  // The format is: 'command-alias': '@package-name-that-should-handle-it'
  // Each package can expose multiple commands, so we resolve conflicts per command
  aliases: {
    // Example: If multiple packages register 'check:types':
    // 'check:types': '@auto-engineer/backend-checks',
    // Example: If both react-graphql-generator and another package register 'generate:client':
    // 'generate:client': '@auto-engineer/react-graphql-generator',
  },
};
