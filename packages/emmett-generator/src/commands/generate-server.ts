import 'reflect-metadata';
import fs from 'fs-extra';
import * as path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { generateScaffoldFilePlans, writeScaffoldFilePlans } from '../codegen/scaffoldFromSchema';
import { ensureDirExists } from '../codegen/utils/path';
import { SpecsSchemaType } from '@auto-engineer/flowlang';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execa } from 'execa';
import createDebug from 'debug';

const debug = createDebug('emmett:generate-server');
const debugSchema = createDebug('emmett:generate-server:schema');
const debugFiles = createDebug('emmett:generate-server:files');
const debugDeps = createDebug('emmett:generate-server:deps');
const debugScaffold = createDebug('emmett:generate-server:scaffold');

// Local CQRS types to avoid cross-package type resolution issues during build
type DefaultRecord = Record<string, unknown>;
export type Command<CommandType extends string = string, CommandData extends DefaultRecord = DefaultRecord> = Readonly<{
  type: CommandType;
  data: Readonly<CommandData>;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
}>;
export type Event<EventType extends string = string, EventData extends DefaultRecord = DefaultRecord> = Readonly<{
  type: EventType;
  data: Readonly<EventData>;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
}>;
export type CommandHandler<TCommand extends Command = Command> = {
  name: string;
  handle: (command: TCommand) => Promise<void>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type GenerateServerCommand = Command<
  'GenerateServer',
  {
    schemaPath: string;
    destination: string; // the project root where "server" directory will be created
  }
>;

export type ServerGeneratedEvent = Event<
  'ServerGenerated',
  {
    schemaPath: string;
    destination: string;
    serverDir: string;
    contextSchemaGraphQL?: string;
  }
>;

export type ServerGenerationFailedEvent = Event<
  'ServerGenerationFailed',
  {
    schemaPath: string;
    destination: string;
    error: string;
  }
>;

// eslint-disable-next-line complexity
export async function handleGenerateServerCommand(
  command: GenerateServerCommand,
): Promise<ServerGeneratedEvent | ServerGenerationFailedEvent> {
  const { schemaPath, destination } = command.data;

  debug('Starting server generation');
  debug('Schema path: %s', schemaPath);
  debug('Destination: %s', destination);

  try {
    const absDest = resolve(destination);
    const absSchema = resolve(schemaPath);

    debug('Resolved paths:');
    debug('  Absolute destination: %s', absDest);
    debug('  Absolute schema: %s', absSchema);

    if (!existsSync(absSchema)) {
      debug('Schema file not found at %s', absSchema);
      return {
        type: 'ServerGenerationFailed',
        data: {
          schemaPath,
          destination,
          error: `Schema file not found at ${absSchema}`,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    debugSchema('Reading schema file from %s', absSchema);
    const content = await readFile(absSchema, 'utf8');

    debugSchema('Schema content length: %d bytes', content.length);
    const spec = JSON.parse(content) as SpecsSchemaType;

    debugSchema('Parsed schema:');
    debugSchema('  Flows: %d', spec.flows?.length || 0);
    debugSchema('  Messages: %d', spec.messages?.length || 0);
    debugSchema('  Integrations: %d', spec.integrations?.length ?? 0);

    if (spec.flows !== undefined && spec.flows.length > 0) {
      debugSchema(
        'Flow names: %o',
        spec.flows.map((f) => f.name),
      );
      spec.flows.forEach((flow) => {
        debugSchema('  Flow "%s" has %d slices', flow.name, flow.slices?.length || 0);
        flow.slices?.forEach((slice) => {
          debugSchema('    Slice: %s (type: %s)', slice.name, slice.type);
        });
      });
    }

    const serverDir = join(absDest, 'server');
    debug('Server directory: %s', serverDir);
    console.debug('🔄 Generating server...', serverDir);

    await ensureDirExists(serverDir);
    debugFiles('Created server directory: %s', serverDir);

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

    // Copy package resources from this package, not from process.cwd()
    const packageRoot = path.resolve(__dirname, '..');
    debugFiles('Package root: %s', packageRoot);

    debugFiles('Copying utility files...');
    await copyRootFilesFromSrc(path.join(packageRoot, 'utils'), path.join(serverDir, 'src', 'utils'));

    debugFiles('Copying server.ts...');
    await copyRootFilesFromSrc(path.join(packageRoot, 'server.ts'), path.join(serverDir, 'src'));

    debugFiles('Copying domain shared files...');
    await copySharedAndRootFiles(path.join(packageRoot, 'domain'), path.join(serverDir, 'src', 'domain'));

    debugFiles('Writing package.json...');
    await writePackage(serverDir);

    debugFiles('Writing tsconfig.json...');
    await writeTsconfig(serverDir);

    debugFiles('Writing vitest config...');
    await writeVitestConfig(serverDir);

    debugFiles('Generating GraphQL schema script...');
    await generateSchemaScript(serverDir, absDest);

    // Try to install deps and build GraphQL schema, but do not fail the whole command if this step fails
    debugDeps('Installing dependencies and generating GraphQL schema...');
    await installDependenciesAndGenerateSchema(serverDir, absDest);

    debug('Server generation completed successfully');
    debug('Server directory: %s', serverDir);

    return {
      type: 'ServerGenerated',
      data: {
        schemaPath,
        destination,
        serverDir,
        contextSchemaGraphQL: join(absDest, '.context', 'schema.graphql'),
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error) {
    debug('Server generation failed with error: %O', error);

    return {
      type: 'ServerGenerationFailed',
      data: {
        schemaPath,
        destination,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const generateServerCommandHandler: CommandHandler<GenerateServerCommand> = {
  name: 'GenerateServer',
  handle: async (command: GenerateServerCommand): Promise<void> => {
    const result = await handleGenerateServerCommand(command);
    if (result.type === 'ServerGenerated') {
      console.log(`Server generated at ${result.data.serverDir}`);
    } else {
      console.error(`Failed to generate server: ${result.data.error}`);
    }
  },
};

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

  const packageRoot = path.resolve(__dirname, '../..');
  const localPkgPath = path.resolve(packageRoot, 'package.json');
  const rootPkgPath = path.resolve(packageRoot, '../../package.json');

  debugFiles('  Local package path: %s', localPkgPath);
  debugFiles('  Root package path: %s', rootPkgPath);

  const localPkg = (await fs.readJson(localPkgPath).catch(() => ({}))) as {
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
    },
    dependencies: resolveDeps([
      '@event-driven-io/emmett',
      'type-graphql',
      'graphql',
      'fast-glob',
      'reflect-metadata',
      'zod',
      'apollo-server',
      'uuid',
    ]),
    devDependencies: resolveDeps(['typescript', 'vitest', 'tsx']),
  } as const;

  const existingPkg = (await fs.readJson(path.join(dest, 'package.json')).catch(() => ({}))) as Record<string, unknown>;
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
  console.log('📦 Installing dependencies...');
  debugDeps('Starting dependency installation in %s', serverDir);

  try {
    debugDeps('Running: pnpm install');
    await execa('pnpm', ['install'], { cwd: serverDir });
    console.log('✅ Dependencies installed successfully');
    debugDeps('Dependencies installed successfully');

    console.log('🔄 Generating GraphQL schema...');
    debugDeps('Running: tsx scripts/generate-schema.ts');
    await execa('tsx', ['scripts/generate-schema.ts'], { cwd: serverDir });

    const schemaPath = join(workingDir, '.context', 'schema.graphql');
    console.log(`✅ GraphQL schema generated at: ${schemaPath}`);
    debugDeps('GraphQL schema generated at: %s', schemaPath);
  } catch (error) {
    debugDeps('Failed to install dependencies or generate schema: %O', error);
    console.warn(
      `⚠️  Failed to install dependencies or generate schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    console.warn('You can manually run: cd server && pnpm install && npx tsx scripts/generate-schema.ts');
  }
}
