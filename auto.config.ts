// Import specific command handlers to resolve conflicts or create aliases
// import { checkTypesCommandHandler } from '@auto-engineer/backend-checks';

export default {
  plugins: [
    '@auto-engineer/flowlang',
    '@auto-engineer/emmett-generator',
    '@auto-engineer/flowlang',
    '@auto-engineer/frontend-checks',
    '@auto-engineer/frontend-implementation',
    '@auto-engineer/information-architect',
    '@auto-engineer/react-graphql-generator',
    '@auto-engineer/server-implementer',
  ],

  aliases: {
    // If multiple packages tried to register 'check:types', you'd resolve it:
    // 'test:types': checkTypesCommandHandler,     // auto test → runs check:types via specific handler
  },
};
