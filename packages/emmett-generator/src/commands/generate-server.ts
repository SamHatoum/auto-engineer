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

export async function handleGenerateServerCommand(
  command: GenerateServerCommand,
): Promise<ServerGeneratedEvent | ServerGenerationFailedEvent> {
  const { schemaPath, destination } = command.data;

  try {
    const absDest = resolve(destination);
    const absSchema = resolve(schemaPath);

    if (!existsSync(absSchema)) {
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

    const content = await readFile(absSchema, 'utf8');
    const spec = JSON.parse(content) as SpecsSchemaType;
    const serverDir = join(absDest, 'server');

    await ensureDirExists(serverDir);

    const filePlans = await generateScaffoldFilePlans(
      spec.flows,
      spec.messages,
      spec.integrations,
      join(serverDir, 'src', 'domain', 'flows'),
    );
    await writeScaffoldFilePlans(filePlans);

    // Copy package resources from this package, not from process.cwd()
    const packageRoot = path.resolve(__dirname, '..');
    await copyRootFilesFromSrc(path.join(packageRoot, 'utils'), path.join(serverDir, 'src', 'utils'));
    await copyRootFilesFromSrc(path.join(packageRoot, 'server.ts'), path.join(serverDir, 'src'));
    await copySharedAndRootFiles(path.join(packageRoot, 'domain'), path.join(serverDir, 'src', 'domain'));

    await writePackage(serverDir);
    await writeTsconfig(serverDir);
    await writeVitestConfig(serverDir);

    await generateSchemaScript(serverDir, absDest);

    // Try to install deps and build GraphQL schema, but do not fail the whole command if this step fails
    await installDependenciesAndGenerateSchema(serverDir, absDest);

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
  // If "from" is a file, copy it directly to directory "to" maintaining filename
  const fromStat = await fs.stat(from).catch(() => undefined);
  if (fromStat !== undefined && fromStat.isFile()) {
    await fs.ensureDir(to);
    const destFile = path.join(to, path.basename(from));
    await fs.copy(from, destFile);
    return;
  }

  if (!(await fs.pathExists(from))) {
    return;
  }

  await fs.ensureDir(to);
  const rootFiles = await fs.readdir(from);
  for (const file of rootFiles) {
    const srcFile = path.join(from, file);
    const stat = await fs.stat(srcFile);
    if (stat.isFile()) {
      const destFile = path.join(to, file);
      await fs.copy(srcFile, destFile);
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
  const packageRoot = path.resolve(__dirname, '../..');
  const localPkgPath = path.resolve(packageRoot, 'package.json');
  const rootPkgPath = path.resolve(packageRoot, '../../package.json');

  const localPkg = (await fs.readJson(localPkgPath).catch(() => ({}))) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const rootPkg = (await fs.readJson(rootPkgPath).catch(() => ({}))) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const getDepVersion = (dep: string): string | undefined => {
    return (
      localPkg.dependencies?.[dep] ??
      localPkg.devDependencies?.[dep] ??
      rootPkg.dependencies?.[dep] ??
      rootPkg.devDependencies?.[dep]
    );
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
import { loadResolvers } from '../utils/loadResolvers';

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

async function installDependenciesAndGenerateSchema(serverDir: string, _workingDir: string): Promise<void> {
  try {
    await execa('pnpm', ['install'], { cwd: serverDir });
    await execa('tsx', ['scripts/generate-schema.ts'], { cwd: serverDir });
  } catch {
    // Best-effort; non-fatal
  }
}
