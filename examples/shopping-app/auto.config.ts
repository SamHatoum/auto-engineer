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
const lastError = fold<any, Event>('*', (state = null, event) => {
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
    data: { schemaPath: event.data.outputPath, destination: event.data.outputPath.replace('/schema.json', '/server') },
  }),
);

on<ServerGeneratedEvent>('ServerGenerated', (event) =>
  dispatch.parallel<ImplementServerCommand | GenerateIACommand>([
    { type: 'ImplementServer', data: { serverDirectory: event.data.serverDir } },
    {
      type: 'GenerateIA',
      data: { outputDir: event.data.destination + '/.context', flowFiles: [event.data.schemaPath] },
    },
  ]),
);

// on<ServerImplementedEvent>('ServerImplemented', (event) =>
//   dispatch.parallel<CheckTypesCommand | CheckTestsCommand | CheckLintCommand>([
//     { type: 'CheckTypes', data: { targetDirectory: event.data.serverDirectory, scope: 'project' } },
//     { type: 'CheckTests', data: { targetDirectory: event.data.serverDirectory, scope: 'project' } },
//     { type: 'CheckLint', data: { targetDirectory: event.data.serverDirectory, scope: 'project' } },
//   ]),
// );

// on<IAGeneratedEvent>('IAGenerated', (event) =>
//   dispatch<ImplementClientCommand>({
//     type: 'ImplementClient',
//     data: {
//       projectDir: event.data.outputDir.replace('/.context', '/client'),
//       iaSchemeDir: event.data.outputDir,
//       designSystemPath: './.context/design-system.md',
//     },
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
