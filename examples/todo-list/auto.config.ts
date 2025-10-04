import { autoConfig, on, dispatch } from '@auto-engineer/cli';
import type { ExportSchemaEvents } from '@auto-engineer/flow';
import type {
  GenerateServerCommand,
  GenerateServerEvents,
  SliceGeneratedEvent,
} from '@auto-engineer/server-generator-apollo-emmett';
import type { ImplementSliceEvents, ImplementSliceCommand } from '@auto-engineer/server-implementer';
import type {
  CheckTestsCommand,
  CheckTypesCommand,
  CheckLintCommand,
  TestsCheckFailedEvent,
  TypeCheckFailedEvent,
  LintCheckFailedEvent,
} from '@auto-engineer/server-checks';
import type { GenerateIACommand, GenerateIAEvents } from '@auto-engineer/information-architect';
import type { ImplementClientCommand } from '@auto-engineer/frontend-implementer';
import type { GenerateClientCommand, GenerateClientEvents } from '@auto-engineer/frontend-generator-react-graphql';
import type { CheckClientEvents } from '@auto-engineer/frontend-checks';

const sliceRetryState = new Map<string, number>();
const MAX_RETRIES = 3;

interface CheckFailures {
  testsCheckFailed?: TestsCheckFailedEvent;
  typeCheckFailed?: TypeCheckFailedEvent;
  lintCheckFailed?: LintCheckFailedEvent;
}

type EventsType = Record<
  string,
  Array<{
    type: string;
    data: { targetDirectory?: string; errors?: string };
  }>
>;

export default autoConfig({
  fileId: 'todoK4nB2',

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
      dispatch<GenerateServerCommand>('GenerateServer', {
        modelPath: './.context/schema.json',
        destination: '.',
      }),
    );
    on<SliceGeneratedEvent>('SliceGenerated', (e) =>
      dispatch<ImplementSliceCommand>('ImplementSlice', {
        slicePath: e.data.slicePath,
        context: {
          previousOutputs: 'errors',
          attemptNumber: 0,
        },
      }),
    );

    on<ImplementSliceEvents>('SliceImplemented', (e) =>
      dispatch<CheckTestsCommand>('CheckTests', {
        targetDirectory: e.data.slicePath,
        scope: 'slice',
      }),
    );

    on<ImplementSliceEvents>('SliceImplemented', (e) =>
      dispatch<CheckTypesCommand>('CheckTypes', {
        targetDirectory: e.data.slicePath,
        scope: 'slice',
      }),
    );

    on<ImplementSliceEvents>('SliceImplemented', (e) =>
      dispatch<CheckLintCommand>('CheckLint', {
        targetDirectory: e.data.slicePath,
        scope: 'slice',
        fix: true,
      }),
    );

    on.settled<CheckTestsCommand, CheckTypesCommand, CheckLintCommand>(
      ['CheckTests', 'CheckTypes', 'CheckLint'],
      dispatch<ImplementSliceCommand>(['ImplementSlice'], (events, send) => {
        const failures = findCheckFailures(events);
        const slicePath = getSlicePath(failures, events);

        if (!hasAnyFailures(failures)) {
          sliceRetryState.delete(slicePath);
          return { persist: false };
        }

        const currentAttempt = sliceRetryState.get(slicePath) ?? 0;

        if (currentAttempt >= MAX_RETRIES) {
          sliceRetryState.delete(slicePath);
          return { persist: false };
        }

        sliceRetryState.set(slicePath, currentAttempt + 1);

        send({
          type: 'ImplementSlice',
          data: {
            slicePath,
            context: {
              previousOutputs: collectErrorMessages(failures),
              attemptNumber: currentAttempt + 1,
            },
          },
        });

        return { persist: true };
      }),
    );

    on<GenerateServerEvents>('ServerGenerated', () =>
      dispatch<GenerateIACommand>('GenerateIA', {
        modelPath: './.context/schema.json',
        outputDir: './.context',
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

    // on<ImplementClientEvents>('ClientImplemented', () =>
    //   dispatch<CheckClientCommand>('CheckClient', {
    //     clientDirectory: './client',
    //     skipBrowserChecks: true,
    //   }),
    // );

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

function findCheckFailures(events: EventsType): CheckFailures {
  const checkTests = events.CheckTests as Array<
    TestsCheckFailedEvent | { type: string; data: { targetDirectory: string } }
  >;
  const checkTypes = events.CheckTypes as Array<
    TypeCheckFailedEvent | { type: string; data: { targetDirectory: string } }
  >;
  const checkLint = events.CheckLint as Array<
    LintCheckFailedEvent | { type: string; data: { targetDirectory: string } }
  >;

  return {
    testsCheckFailed: checkTests.find((e): e is TestsCheckFailedEvent => e.type === 'TestsCheckFailed'),
    typeCheckFailed: checkTypes.find((e): e is TypeCheckFailedEvent => e.type === 'TypeCheckFailed'),
    lintCheckFailed: checkLint.find((e): e is LintCheckFailedEvent => e.type === 'LintCheckFailed'),
  };
}

function hasAnyFailures(failures: CheckFailures): boolean {
  return (
    failures.testsCheckFailed !== undefined ||
    failures.typeCheckFailed !== undefined ||
    failures.lintCheckFailed !== undefined
  );
}

function getSlicePath(failures: CheckFailures, events: EventsType): string {
  return (
    failures.testsCheckFailed?.data.targetDirectory ??
    failures.typeCheckFailed?.data.targetDirectory ??
    failures.lintCheckFailed?.data.targetDirectory ??
    (events.CheckTests[0]?.data.targetDirectory as string) ??
    ''
  );
}

function collectErrorMessages(failures: CheckFailures): string {
  const errorMessages: string[] = [];
  if (failures.testsCheckFailed !== undefined) {
    errorMessages.push(failures.testsCheckFailed.data.errors);
  }
  if (failures.typeCheckFailed !== undefined) {
    errorMessages.push(failures.typeCheckFailed.data.errors);
  }
  if (failures.lintCheckFailed !== undefined) {
    errorMessages.push(failures.lintCheckFailed.data.errors);
  }
  return errorMessages.join('\n');
}

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
