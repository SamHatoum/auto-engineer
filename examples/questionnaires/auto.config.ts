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
      schemaPath:
        '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/.context/schema.json',
      destination: '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires',
    },
  }),
);

// on<ServerGeneratedEvent>('ServerGenerated', (event) =>
//   dispatch<ImplementServerCommand>(
//     {
//       type: 'ImplementServer', data: {
//         serverDirectory: '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/server'
//       }
//     })
// );

on<ServerGeneratedEvent>('ServerGenerated', () =>
  dispatch<GenerateIACommand>({
    type: 'GenerateIA',
    data: {
      outputDir: '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/.context',
      flowFiles: [
        '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/flows/questionnaires.flow.ts',
      ],
    },
  }),
);

on<IAGeneratedEvent>('IAGenerated', (event) =>
  dispatch<GenerateClientCommand>({
    type: 'GenerateClient',
    data: {
      starterDir:
        '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/packages/frontend-generator-react-graphql/shadcn-starter',
      targetDir: '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/client',
      iaSchemaPath:
        '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/.context/auto-ia-scheme.json',
      gqlSchemaPath:
        '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/.context/schema.graphql',
      figmaVariablesPath:
        '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/.context/figma-variables.json',
    },
  }),
);

// on<ServerGeneratedEvent>('ServerGenerated', (event) =>
//   dispatch<ImplementServerCommand>(
//     {
//       type: 'ImplementServer', data: {
//         serverDirectory: '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/server'
//       }
//     })
// );

// {
// "error": "ENOENT: no such file or directory, open '/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/.context/schema.graphql'",
// "targetDir": "/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/client"
// }

// on<ClientGeneratedEvent>('ClientGenerated', (event) =>
//   dispatch<ImplementClientCommand>({
//     type: 'ImplementClient',
// data: {
//   projectDir: "/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/client",
//   iaSchemeDir: "/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/.context",
//   designSystemPath: "/Users/ramihatoum/WebstormProjects/xolvio/auto-engineer/examples/questionnaires/.context/design-system.md",
// },
//   }),
// );

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

// let retryCount = 0;
// on<TypeCheckFailedEvent>('TypeCheckFailed', (event) => {
//   retryCount++;
//   if (retryCount > 3) {
//     retryCount = 0;
//     // Regenerate server from scratch
//     return dispatch<GenerateServerCommand>({
//       type: 'GenerateServer',
//       data: {
//         schemaPath: event.data.targetDirectory.replace('/server', '') + '/schema.json',
//         destination: event.data.targetDirectory.replace('/server', ''),
//       },
//     });
//   }
// });

// // Reset retry count on success
// on<TypeCheckPassedEvent>('TypeCheckPassed', () => {
//   retryCount = 0;
// });
