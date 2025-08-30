// Import specific command handlers to resolve conflicts or create aliases
// import { checkTypesCommandHandler } from '@auto-engineer/server-checks';

export default {
  plugins: [
    '@auto-engineer/server-checks',
    '@auto-engineer/design-system-importer',
    '@auto-engineer/server-generator-apollo-emmett',
    '@auto-engineer/flow',
    '@auto-engineer/frontend-checks',
    '@auto-engineer/frontend-implementer',
    '@auto-engineer/information-architect',
    '@auto-engineer/frontend-generator-react-graphql',
    '@auto-engineer/server-implementer',
  ],

  aliases: {
    // If multiple packages tried to register 'check:types', you'd resolve it:
    // 'test:types': checkTypesCommandHandler,     // auto test → runs check:types via specific handler
  },
};
