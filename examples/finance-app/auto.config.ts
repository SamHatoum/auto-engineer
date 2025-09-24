import { autoConfig, on, dispatch } from '@auto-engineer/cli';
import type { ExportSchemaCommand, ExportSchemaEvents } from '@auto-engineer/flow';
import type { GenerateServerCommand, GenerateServerEvents } from '@auto-engineer/server-generator-apollo-emmett';
import type {
  ImplementServerCommand,
  ImplementServerEvents,
  ImplementSliceEvents,
  ImplementSliceCommand,
} from '@auto-engineer/server-implementer';
import type {
  CheckTestsCommand,
  CheckTestsEvents,
  CheckTypesCommand,
  CheckTypesEvents,
  CheckLintCommand,
  CheckLintEvents,
  TestsCheckFailedEvent,
} from '@auto-engineer/server-checks';
import type { GenerateIACommand, GenerateIAEvents } from '@auto-engineer/information-architect';
import type { ImplementClientCommand, ImplementClientEvents } from '@auto-engineer/frontend-implementer';
import type { GenerateClientCommand, GenerateClientEvents } from '@auto-engineer/frontend-generator-react-graphql';
import {
  CheckClientCommand,
  CheckClientEvents,
  ClientCheckFailedEvent,
} from '../../packages/frontend-checks/dist/src/commands/check-client';

export default autoConfig({
  fileId: 'test33333', // unique 9-character base62 canvas file id where all flows in this project will be shown

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
  pipeline: () => {
    on<ExportSchemaEvents>('SchemaExported', () =>
      dispatch<GenerateIACommand>({
        type: 'GenerateIA',
        data: {
          outputDir: './.context',
          modelPath: './.context/schema.json',
        },
      }),
    );

    on<GenerateIAEvents>('IAGenerated', () =>
      dispatch<GenerateClientCommand>('GenerateClient', {
        starterDir: '../../packages/frontend-generator-react-graphql/shadcn-starter',
        targetDir: './client',
        iaSchemaPath: './.context/auto-ia-scheme.json',
        gqlSchemaPath: './.context/schema.graphql',
        figmaVariablesPath: './.context/figma-file.json',
      }),
    );

    on<GenerateClientEvents>('ClientGenerated', () =>
      dispatch<ImplementClientCommand>('ImplementClient', {
        projectDir: './client',
        iaSchemeDir: './.context',
        designSystemPath: './.context/design-system.md',
      }),
    );

    on<ImplementClientEvents>('ClientImplemented', () =>
      dispatch<CheckClientCommand>('CheckClient', {
        clientDirectory: './client',
        skipBrowserChecks: true,
      }),
    );

    on<CheckClientEvents>('ClientChecked', (e) => {
      if (e.type === 'ClientChecked') {
        const hasErrors = e.data.tsErrors > 0 || e.data.buildErrors > 0 || e.data.consoleErrors > 0;

        if (hasErrors) {
          const failures = [
            ...(e.data.tsErrorDetails || []),
            ...(e.data.buildErrorDetails || []),
            ...(e.data.consoleErrorDetails || []),
          ];
          return dispatch<ImplementClientCommand>('ImplementClient', {
            projectDir: './client',
            iaSchemeDir: './.context',
            designSystemPath: './.context/design-system.md',
            failures,
          });
        }
      }
    });
  },
});

/*

rm -rf server client .context/schema.json .context/schema.graphql .context/auto-ia-scheme.json 
pnpm auto export:schema
pnpm auto generate:ia --output-dir=./.context --flow-files=./flows/questionnaires.flow.ts
pnpm auto generate:server --schema-path=./.context/schema.json --destination=.
pnpm auto generate:client --starter-dir=../../packages/frontend-generator-react-graphql/shadcn-starter --target-dir=./client  --ia-schema-path=./.context/auto-ia-scheme.json  --gql-schema-path=./.context/schema.graphql  --figma-variables-path=./.context/figma-file.json
pnpm auto implement:client --project-dir=./questionnaires/client --ia-scheme-dir=./questionnaires/.context --design-system-path=./questionnaires/.context/design-system.md


// make this emit one slice at a time
pnpm auto generate:server --schema-path=./.context/schema.json --destination=.

// TODO remove the AI part and make it mathematical
pnpm auto generate:client --starter-dir=/Users/sam/WebstormProjects/top/auto-engineer/packages/frontend-generator-react-graphql/shadcn-starter  --target-dir=./client  --ia-schema-path=./.context/auto-ia-scheme.json  --gql-schema-path=./.context/schema.graphql  --figma-variables-path=./.context/figma-file.json

// run this per slice in parallel
pnpm auto implement:slice --slice-path=./questionnaires/server/src/domain/flows/questionnaires/submits-the-questionnaire
// add checks
// add retry logic tore-implement failed slices with a retry count

// slice these up
pnpm auto implement:client --project-dir=./questionnaires/client --ia-scheme-dir=./questionnaires/.context --design-system-path=./questionnaires/.context/design-system.md


// implement atoms in parallel - how do I know all atoms are done?
// implement molecules in parallel - how do I know all molecules are done?
// implement organisms in parallel - how do I know all organisms are done?
// implement pages in parallel - how do I know all pages are done?


// generate slice > implement slice > check slice > retry failure 3 times > 
// generate slice > implement slice > check slice > retry failure 3 times > 
// generate slice > implement slice > check slice > retry failure 3 times > 

cd ~/WebstormProjects/top/auto-engineer/examples/questionnaires &&\
pnpm -w build &&\
rm -rf server client .context/schema.json .context/schema.graphql .context/auto-ia-scheme.json &&\
DEBUG=* pnpm auto export:schema &&\
DEBUG=* pnpm auto generate:server --schema-path=./.context/schema.json --destination=. &&\
DEBUG=* pnpm auto generate:ia --output-dir=./.context --flow-files=./flows/questionnaires.flow.ts &&\
DEBUG=* pnpm auto generate:client --starter-dir=../../packages/frontend-generator-react-graphql/shadcn-starter --target-dir=./client  --ia-schema-path=./.context/auto-ia-scheme.json  --gql-schema-path=./.context/schema.graphql  --figma-variables-path=./.context/figma-file.json


*/
