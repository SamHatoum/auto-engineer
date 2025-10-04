import 'reflect-metadata';
import fs from 'fs-extra';
import * as path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { generateScaffoldFilePlans, writeScaffoldFilePlans } from '../codegen/scaffoldFromSchema';
import { ensureDirExists, ensureDirPath, toKebabCase } from '../codegen/utils/path';
import { Model } from '@auto-engineer/flow';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execa } from 'execa';
import createDebug from 'debug';
import { defineCommandHandler, Command, Event } from '@auto-engineer/message-bus';

const debug = createDebug('auto:server-generator-apollo-emmett');
const debugModel = createDebug('auto:server-generator-apollo-emmett:schema');
const debugFiles = createDebug('auto:server-generator-apollo-emmett:files');
const debugDeps = createDebug('auto:server-generator-apollo-emmett:deps');
const debugScaffold = createDebug('auto:server-generator-apollo-emmett:scaffold');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type GenerateServerCommand = Command<
  'GenerateServer',
  {
    modelPath: string;
    destination: string; // the project root where "server" directory will be created
  }
>;

export type ServerGeneratedEvent = Event<
  'ServerGenerated',
  {
    modelPath: string;
    destination: string;
    serverDir: string;
    contextSchemaGraphQL?: string;
  }
>;

export type ServerGenerationFailedEvent = Event<
  'ServerGenerationFailed',
  {
    modelPath: string;
    destination: string;
    error: string;
  }
>;

export type SliceGeneratedEvent = Event<
  'SliceGenerated',
  {
    flowName: string;
    sliceName: string;
    sliceType: string;
    schemaPath: string;
    slicePath: string;
  }
>;

export type GenerateServerEvents = ServerGeneratedEvent | ServerGenerationFailedEvent | SliceGeneratedEvent;

export const commandHandler = defineCommandHandler({
  name: 'GenerateServer',
  alias: 'generate:server',
  description: 'Generate server from model',
  category: 'generate',
  icon: 'server',
  events: ['ServerGenerated', 'ServerGenerationFailed', 'SliceGenerated'],
  fields: {
    modelPath: {
      description: 'Path to the json model file',
      required: true,
    },
    destination: {
      description: 'Destination directory for generated server',
      required: true,
    },
  },
  examples: ['$ auto generate:server --model-path=.context/model.json --destination=.'],
  handle: async (command: Command): Promise<GenerateServerEvents | GenerateServerEvents[]> => {
    const typedCommand = command as GenerateServerCommand;
    const result = await handleGenerateServerCommandInternal(typedCommand);
    const events = Array.isArray(result) ? result : [result];
    const finalEvent = events[events.length - 1];
    if (finalEvent.type === 'ServerGenerated') {
      debug('Server generated at %s', finalEvent.data.serverDir);
    } else if (finalEvent.type === 'ServerGenerationFailed') {
      debug('Failed to generate server: %s', finalEvent.data.error);
    }

    return result;
  },
});

async function validateModelFile(
  absModel: string,
  command: GenerateServerCommand,
): Promise<ServerGenerationFailedEvent | null> {
  if (!existsSync(absModel)) {
    debug('Model file not found at %s', absModel);
    return {
      type: 'ServerGenerationFailed',
      data: {
        modelPath: command.data.modelPath,
        destination: command.data.destination,
        error: `Model file not found at ${absModel}`,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
  return null;
}

async function readAndParseModel(absModel: string): Promise<Model> {
  debugModel('Reading model file from %s', absModel);
  const content = await readFile(absModel, 'utf8');

  debugModel('Model content length: %d bytes', content.length);
  const spec = JSON.parse(content) as Model;

  debugModel('Parsed model:');
  debugModel('  Flows: %d', spec.flows?.length || 0);
  debugModel('  Messages: %d', spec.messages?.length || 0);
  debugModel('  Integrations: %d', spec.integrations?.length ?? 0);

  logFlowDetails(spec);
  return spec;
}

function logFlowDetails(spec: Model): void {
  if (spec.flows !== undefined && spec.flows.length > 0) {
    debugModel(
      'Flow names: %o',
      spec.flows.map((f) => f.name),
    );
    spec.flows.forEach((flow) => {
      debugModel('  Flow "%s" has %d slices', flow.name, flow.slices?.length || 0);
      flow.slices?.forEach((slice) => {
        debugModel('    Slice: %s (type: %s)', slice.name, slice.type);
      });
    });
  }
}

async function generateAndWriteScaffold(spec: Model, serverDir: string): Promise<void> {
  const domainFlowsPath = join(serverDir, 'src', 'domain', 'flows');
  debugScaffold('Generating scaffold file plans');
  debugScaffold('  Domain flows path: %s', domainFlowsPath);
  debugScaffold('  Number of flows: %d', spec.flows?.length || 0);

  const filePlans = await generateScaffoldFilePlans(spec.flows, spec.messages, spec.integrations, domainFlowsPath);

  debugScaffold('Generated %d file plans', filePlans.length);
  if (filePlans.length > 0) {
    debugScaffold('Sample file paths:');
    filePlans.slice(0, 5).forEach((plan) => {
      debugScaffold('  - %s', plan.outputPath);
    });
  }

  await writeScaffoldFilePlans(filePlans);
  debugScaffold('Written all scaffold files');
}

async function copyAllFiles(serverDir: string): Promise<void> {
  const packageDistRoot = path.resolve(__dirname, '../..');
  debugFiles('Package dist root: %s', packageDistRoot);

  debugFiles('Copying utility files...');
  await copyRootFilesFromSrc(path.join(packageDistRoot, 'src', 'utils'), path.join(serverDir, 'src', 'utils'));

  debugFiles('Copying server.ts...');
  await copyRootFilesFromSrc(path.join(packageDistRoot, 'src', 'server.ts'), path.join(serverDir, 'src'));

  debugFiles('Copying domain shared files...');
  await copySharedAndRootFiles(path.join(packageDistRoot, 'src', 'domain'), path.join(serverDir, 'src', 'domain'));
}

async function writeConfigurationFiles(serverDir: string, absDest: string): Promise<void> {
  debugFiles(`Writing package.json... to ${serverDir}`);
  await writePackage(serverDir);

  debugFiles(`Writing tsconfig.json... to ${serverDir}`);
  await writeTsconfig(serverDir);

  debugFiles(`Writing vitest config... to ${serverDir}`);
  await writeVitestConfig(serverDir);

  debugFiles(`Generating GraphQL schema script... ${serverDir} to ${absDest}`);
  await generateSchemaScript(serverDir, absDest);
}

function createServerSuccessEvent(
  command: GenerateServerCommand,
  serverDir: string,
  absDest: string,
): ServerGeneratedEvent {
  return {
    type: 'ServerGenerated',
    data: {
      modelPath: command.data.modelPath,
      destination: command.data.destination,
      serverDir,
      contextSchemaGraphQL: join(absDest, '.context', 'schema.graphql'),
    },
    timestamp: new Date(),
    requestId: command.requestId,
    correlationId: command.correlationId,
  };
}

function createServerFailureEvent(command: GenerateServerCommand, error: unknown): ServerGenerationFailedEvent {
  debug('Server generation failed with error: %O', error);
  return {
    type: 'ServerGenerationFailed',
    data: {
      modelPath: command.data.modelPath,
      destination: command.data.destination,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    },
    timestamp: new Date(),
    requestId: command.requestId,
    correlationId: command.correlationId,
  };
}

export async function handleGenerateServerCommandInternal(
  command: GenerateServerCommand,
): Promise<GenerateServerEvents[]> {
  const { modelPath, destination } = command.data;
  const events: GenerateServerEvents[] = [];

  debug('Starting server generation');
  debug('Model path: %s', modelPath);
  debug('Destination: %s', destination);

  try {
    const absDest = resolve(destination);
    const absModel = resolve(modelPath);

    debug('Resolved paths:');
    debug('  Absolute destination: %s', absDest);
    debug('  Absolute model: %s', absModel);

    const validationError = await validateModelFile(absModel, command);
    if (validationError) return [validationError];

    const spec = await readAndParseModel(absModel);

    // Setup server directory
    const serverDir = join(absDest, 'server');
    debug('Server directory: %s', serverDir);
    debug('🔄 Generating server... %s', serverDir);

    await ensureDirExists(serverDir);
    debugFiles('Created server directory: %s', serverDir);

    await generateAndWriteScaffold(spec, serverDir);

    if (Array.isArray(spec.flows) && spec.flows.length > 0) {
      for (const flow of spec.flows) {
        if (Array.isArray(flow.slices) && flow.slices.length > 0) {
          for (const slice of flow.slices) {
            if (slice.type === 'experience') continue; // skip experience slices
            const sliceEvent: SliceGeneratedEvent = {
              type: 'SliceGenerated',
              data: {
                flowName: flow.name,
                sliceName: slice.name,
                sliceType: slice.type,
                schemaPath: command.data.modelPath,
                slicePath: ensureDirPath('./server/src/domain/flows', toKebabCase(flow.name), toKebabCase(slice.name)),
              },
              timestamp: new Date(),
              requestId: command.requestId,
              correlationId: command.correlationId,
            };
            events.push(sliceEvent);
            debug('SliceGenerated: %s.%s', flow.name, slice.name);
          }
        }
      }
    }

    // Copy files
    await copyAllFiles(serverDir);

    // Write configuration files
    await writeConfigurationFiles(serverDir, absDest);

    // Install dependencies and generate schema
    debugDeps('Installing dependencies and generating GraphQL schema...');
    await installDependenciesAndGenerateSchema(serverDir, absDest);

    debug('Server generation completed successfully');
    debug('Server directory: %s', serverDir);

    // Add final success event
    events.push(createServerSuccessEvent(command, serverDir, absDest));
    return events;
  } catch (error) {
    // Add failure event to events array if any events were already added
    events.push(createServerFailureEvent(command, error));
    return events;
  }
}

async function copyRootFilesFromSrc(from: string, to: string): Promise<void> {
  debugFiles('copyRootFilesFromSrc: from=%s, to=%s', from, to);

  // If "from" is a file, copy it directly to directory "to" maintaining filename
  const fromStat = await fs.stat(from).catch(() => undefined);
  if (fromStat !== undefined && fromStat.isFile()) {
    debugFiles('  Source is a file, copying directly');
    await fs.ensureDir(to);
    const destFile = path.join(to, path.basename(from));
    await fs.copy(from, destFile);
    debugFiles('  Copied file to %s', destFile);
    return;
  }

  if (!(await fs.pathExists(from))) {
    debugFiles('  Source path does not exist: %s', from);
    return;
  }

  await fs.ensureDir(to);
  const rootFiles = await fs.readdir(from);
  debugFiles('  Found %d files in source directory', rootFiles.length);

  for (const file of rootFiles) {
    const srcFile = path.join(from, file);
    const stat = await fs.stat(srcFile);
    if (stat.isFile()) {
      const destFile = path.join(to, file);
      await fs.copy(srcFile, destFile);
      debugFiles('  Copied: %s', file);
    }
  }
}

async function copySharedAndRootFiles(from: string, to: string): Promise<void> {
  const sharedFrom = path.join(from, 'shared');
  const sharedTo = path.join(to, 'shared');
  if (await fs.pathExists(sharedFrom)) {
    await fs.copy(sharedFrom, sharedTo);
  }
  await fs.ensureDir(to);
  const rootFiles = await fs.readdir(from);
  for (const file of rootFiles) {
    if (file.endsWith('.ts')) {
      const srcFile = path.join(from, file);
      const destFile = path.join(to, file);
      await fs.copy(srcFile, destFile);
    }
  }
}

async function writePackage(dest: string): Promise<void> {
  debugFiles('Writing package.json to %s', dest);

  const packageRoot = path.resolve(__dirname, '../../..');
  const localPkgPath = path.resolve(packageRoot, 'package.json');
  const rootPkgPath = path.resolve(packageRoot, '../../package.json');

  debugFiles('  package root: %s', packageRoot);
  debugFiles('  Local package path: %s', localPkgPath);
  debugFiles('  Root package path: %s', rootPkgPath);

  const localPkg = (await fs.readJson(localPkgPath)) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const rootPkg = (await fs.readJson(rootPkgPath).catch(() => ({}))) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const getDepVersion = (dep: string): string | undefined => {
    const version =
      localPkg.dependencies?.[dep] ??
      localPkg.devDependencies?.[dep] ??
      rootPkg.dependencies?.[dep] ??
      rootPkg.devDependencies?.[dep];

    if (version !== undefined) {
      debugFiles('  Found version for %s: %s', dep, version);
    }
    return version;
  };

  const resolveDeps = (deps: string[]): Record<string, string> => {
    return deps.reduce<Record<string, string>>((acc, dep) => {
      const version = getDepVersion(dep);
      if (typeof version === 'string') {
        acc[dep] = version;
      }
      return acc;
    }, {});
  };

  const packageJson = {
    name: 'generated-server',
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      start: 'tsx --no-deprecation src/server.ts',
      'type-check': 'tsc --noEmit',
      test: 'vitest run',
      dev: 'tsx --no-deprecation src/server.ts',
      postinstall: 'npm rebuild sqlite3 2>/dev/null || true',
    },
    dependencies: resolveDeps([
      '@event-driven-io/emmett',
      '@event-driven-io/emmett-sqlite',
      'type-graphql',
      'graphql-type-json',
      'graphql',
      'fast-glob',
      'reflect-metadata',
      'zod',
      'apollo-server',
      'uuid',
      'sqlite3',
    ]),
    devDependencies: resolveDeps(['typescript', 'vitest', 'tsx']),
  } as const;

  debugFiles('Loading package.json from', path.join(dest, 'package.json'));
  const existingPkg = (await fs.readJson(path.join(dest, 'package.json')).catch(() => {
    debugFiles('Failed to load package.json, using empty object');
    return {};
  })) as Record<string, unknown>;
  debugFiles('Existing package.json:', existingPkg);
  const mergedDeps = {
    ...(existingPkg.dependencies as Record<string, string>),
    ...packageJson.dependencies,
  };
  await fs.writeJson(path.join(dest, 'package.json'), { ...packageJson, dependencies: mergedDeps }, { spaces: 2 });
}

async function writeTsconfig(dest: string): Promise<void> {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      outDir: './dist',
      skipLibCheck: true,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
    },
    include: ['src/**/*', 'vitest.config.ts'],
    exclude: ['dist', 'node_modules'],
  };
  const tsconfigPath = path.join(dest, 'tsconfig.json');
  if (!(await fs.pathExists(tsconfigPath))) {
    await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
  }
}

async function writeVitestConfig(dest: string): Promise<void> {
  const vitestConfig = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.specs.ts'],
  },
});
`;

  await writeFile(path.join(dest, 'vitest.config.ts'), vitestConfig, 'utf-8');
}

async function generateSchemaScript(serverDir: string, workingDir: string): Promise<void> {
  const contextDir = path.resolve(`${workingDir}`, '.context');
  await ensureDirExists(contextDir);

  const scriptsDir = join(serverDir, 'scripts');
  await ensureDirExists(scriptsDir);

  const schemaScriptContent = `import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { printSchema } from 'graphql';
import { writeFile } from 'fs/promises';
import * as path from 'path';
import { loadResolvers } from '../src/utils/loadResolvers.js';

async function main() {
  try {
    const resolvers = await loadResolvers('src/domain/flows/**/*.resolver.{ts,js}');
    const schema = await buildSchema({
      resolvers: resolvers as any,
      emitSchemaFile: false,
    });
    const printedSchema = printSchema(schema);

    const contextDir = path.resolve('${workingDir}', '.context');
    const schemaPath = path.join(contextDir, 'schema.graphql');
    await writeFile(schemaPath, printedSchema, 'utf-8');

    console.log(\`✅ GraphQL schema generated at: \${schemaPath}\`);
  } catch (error) {
    console.error(\`❌ GraphQL schema generation failed: \${error instanceof Error ? error.message : 'Unknown error'}\`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;

  const schemaScriptPath = join(scriptsDir, 'generate-schema.ts');
  await writeFile(schemaScriptPath, schemaScriptContent, 'utf-8');
}

async function installDependenciesAndGenerateSchema(serverDir: string, workingDir: string): Promise<void> {
  debugDeps('Installing dependencies...');
  debugDeps('Starting dependency installation in %s', serverDir);
  debugDeps('Hint: You can debug by manually running: cd server && pnpm install && npx tsx scripts/generate-schema.ts');

  try {
    debugDeps('Running pnpm install');
    await execa('pnpm', ['install', '--ignore-workspace'], { cwd: serverDir });
    debugDeps('Dependencies installed successfully');
  } catch (error) {
    debugDeps('Failed to pnpm install: %s', error instanceof Error ? error.message : 'Unknown error');
  }

  try {
    debugDeps('Generating GraphQL schema...');
    debugDeps('Running: tsx scripts/generate-schema.ts', serverDir + '/scripts/generate-schema.ts');
    await execa('tsx', ['scripts/generate-schema.ts'], { cwd: serverDir });
    const schemaPath = join(workingDir, '.context', 'schema.graphql');
    debugDeps('GraphQL schema generated at: %s', schemaPath);
  } catch (error) {
    debugDeps(
      'Failed to run tsx scripts/generate-schema.ts: %s',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Default export is the command handler
export default commandHandler;
