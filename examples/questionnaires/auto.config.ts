import { on, dispatch, fold } from '@auto-engineer/cli';
import type { Command, Event } from '@auto-engineer/message-bus';
import { type ExportSchemaCommand, type SchemaExportedEvent, type SchemaExportFailedEvent } from '@auto-engineer/flow';
import {
  type GenerateServerCommand,
  type ServerGeneratedEvent,
  type ServerGenerationFailedEvent,
} from '@auto-engineer/server-generator-apollo-emmett';
import {
  type ImplementServerCommand,
  type ServerImplementedEvent,
  type ServerImplementationFailedEvent,
} from '@auto-engineer/server-implementer';
import {
  type CheckTypesCommand,
  type TypeCheckPassedEvent,
  type TypeCheckFailedEvent,
  CheckTestsCommand,
  CheckLintCommand,
} from '@auto-engineer/server-checks';
import { CheckClientCommand } from '@auto-engineer/frontend-checks';
import {
  type GenerateIACommand,
  type IAGeneratedEvent,
  type IAGenerationFailedEvent,
} from '@auto-engineer/information-architect';
import {
  type ImplementClientCommand,
  type ClientImplementedEvent,
  type ClientImplementationFailedEvent,
} from '@auto-engineer/frontend-implementer';
import { ClientGeneratedEvent, type GenerateClientCommand } from '@auto-engineer/frontend-generator-react-graphql';

// Plugin configuration
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
    // Resolve command name conflicts between packages
    // 'test:types': checkTypesCommandHandler,
  },
};

// ===== Pipeline Orchestration with DSL =====

// State management: Track pipeline status
const pipelineStatus = fold<string, Event>(
  '*', // Listen to all events
  (state = 'idle', event) => {
    switch (event.type) {
      case 'SchemaExported':
        return 'schema-exported';
      case 'ServerGenerated':
        return 'server-generated';
      case 'ServerImplemented':
        return 'server-implemented';
      case 'TypeCheckPassed':
        return 'checks-passed';
      case 'TypeCheckFailed':
        return 'checks-failed';
      case 'IAGenerated':
        return 'ia-generated';
      case 'ClientImplemented':
        return 'client-implemented';
      default:
        return state;
    }
  },
);

// State: Track last error
const lastError = fold<any, Event>('*', (state: string = 'None', event) => {
  if (event.type.endsWith('Failed') || event.type.endsWith('Error')) {
    return {
      type: event.type,
      data: event.data,
      timestamp: new Date().toISOString(),
    };
  }
  return state;
});

// State: Track completed operations
const completedOperations = fold<string[], Event>('*', (state = [], event) => {
  if (event.type.endsWith('Passed') || event.type.endsWith('Generated') || event.type.endsWith('Implemented')) {
    return [...state, event.type];
  }
  return state;
});

on<SchemaExportedEvent>('SchemaExported', (event) =>
  dispatch<GenerateServerCommand>({
    type: 'GenerateServer',
    data: {
      schemaPath: '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/schema.json',
      destination: '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires',
    },
  }),
);

// on<ServerGeneratedEvent>('ServerGenerated', (event) =>
//   dispatch<ImplementServerCommand>(
//     {
//       type: 'ImplementServer', data: {
//         serverDirectory: '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/server'
//       }
//     })
// );

on<ServerGeneratedEvent>('ServerGenerated', () =>
  dispatch<GenerateIACommand>({
    type: 'GenerateIA',
    data: {
      outputDir: '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context',
      flowFiles: ['/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/flows/questionnaires.flow.ts'],
    },
  }),
);

on<IAGeneratedEvent>('IAGenerated', (event) =>
  dispatch<GenerateClientCommand>({
    type: 'GenerateClient',
    data: {
      starterDir:
        '/Users/sam/WebstormProjects/top/auto-engineer/packages/frontend-generator-react-graphql/shadcn-starter',
      targetDir: '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/client',
      iaSchemaPath:
        '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/auto-ia-scheme.json',
      gqlSchemaPath: '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/schema.graphql',
      figmaVariablesPath:
        '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/figma-variables.json',
    },
  }),
);

on<ClientGeneratedEvent>('ClientGenerated', (event) =>
  dispatch<ImplementClientCommand>({
    type: 'ImplementClient',
    data: {
      projectDir: '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/client',
      iaSchemeDir: '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context',
      designSystemPath:
        '/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/design-system.md',
    },
  }),
);

// on<ClientImplementedEvent>('ClientImplemented', (event) =>
//   dispatch<CheckClientCommand>({ type: 'CheckClient', data: { clientDirectory: './client', skipBrowserChecks: true } }),
// );

// on<ClientImplementationFailedEvent>('ClientImplementationFailed', (event) =>
//   dispatch<ImplementClientCommand>({
//     type: 'ImplementClient',
//     data: {
//       projectDir: event.data.projectDir || './client',
//       iaSchemeDir: './.context',
//       designSystemPath: './.context/design-system.md',
//     },
//   })
// );

// on<TypeCheckFailedEvent>('TypeCheckFailed', (event) =>
//   dispatch<ImplementServerCommand>({
//     type: 'ImplementServer',
//     data: {
//       serverDirectory: event.data.targetDirectory,
//     },
//   })
// );

/*
pnpm auto generate:client --starter-dir=/Users/sam/WebstormProjects/top/auto-engineer/packages/frontend-generator-react-graphql/shadcn-starter  --target-dir=/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/client  --ia-schema-path=/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/auto-ia-scheme.json  --gql-schema-path=/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/schema.graphql  --figma-variables-path=/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/figma-variables.json
pnpm auto implement:client --project-dir=/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/client --ia-scheme-dir=/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context --design-system-path=/Users/sam/WebstormProjects/top/auto-engineer/examples/questionnaires/.context/design-system.md
*/
