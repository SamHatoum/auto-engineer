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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const [, , schemaPath, destination] = process.argv;

  if (!schemaPath || !destination) {
    console.error('Usage: pnpm generate:server ./path/to/schema.json ./path/to/output-dir');
    process.exit(1);
  }

  const absDest = resolve(destination);
  const absSchema = resolve(schemaPath);

  if (!existsSync(absSchema)) {
    console.error(`Schema file not found at ${absSchema}`);
    process.exit(1);
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

  await copyRootFilesFromSrc(path.join(process.cwd(), 'src'), path.join(serverDir, 'src'));
  await copySharedAndRootFiles(path.join(__dirname, '../domain'), path.join(serverDir, 'src/domain'));
  //await copySharedAndRootFiles(path.join(process.cwd(), 'shared'), path.join(serverDir, 'src'));
  await fs.copy(path.join(process.cwd(), 'src/utils'), path.join(serverDir, 'src/utils'));
  await writePackage(serverDir);
  await writeTsconfig(serverDir);
  await writeVitestConfig(serverDir);

  await generateSchemaScript(serverDir, absDest);

  console.log(`✅ Server scaffold generated at: ${serverDir}`);

  await installDependenciesAndGenerateSchema(serverDir, absDest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function copyRootFilesFromSrc(from: string, to: string): Promise<void> {
  if (!(await fs.pathExists(from))) {
    return;
  }

  const rootFiles = await fs.readdir(from);
  for (const file of rootFiles) {
    const srcFile = path.join(from, file);
    const stat = await fs.stat(srcFile);
    if (stat.isFile() && file.endsWith('.ts')) {
      const destFile = path.join(to, file);
      await fs.copy(srcFile, destFile);
      console.log(`✅ Copied ${file} from ${from} to ${to}`);
    }
  }
}

async function copySharedAndRootFiles(from: string, to: string): Promise<void> {
  const sharedFrom = path.join(from, 'shared');
  const sharedTo = path.join(to, 'shared');
  if (await fs.pathExists(sharedFrom)) {
    await fs.copy(sharedFrom, sharedTo);
    console.log(`✅ Copied shared/ from ${sharedFrom} to ${sharedTo}`);
  }
  const rootFiles = await fs.readdir(from);
  for (const file of rootFiles) {
    if (file.endsWith('.ts')) {
      const srcFile = path.join(from, file);
      const destFile = path.join(to, file);
      await fs.copy(srcFile, destFile);
      console.log(`✅ Copied ${file} from ${from} to ${to}`);
    }
  }
}

async function writePackage(dest: string): Promise<void> {
  const localPkgPath = path.resolve(process.cwd(), 'package.json');
  const rootPkgPath = path.resolve(__dirname, '../../../../package.json');

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
  };

  const existingPkg = (await fs.readJson(path.join(dest, 'package.json')).catch(() => ({}))) as Record<string, unknown>;
  packageJson.dependencies = {
    ...(existingPkg.dependencies as Record<string, string>),
    ...packageJson.dependencies,
  };
  console.log('✅ Merged existing package.json dependecies');
  await fs.writeJson(path.join(dest, 'package.json'), packageJson, { spaces: 2 });
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
    console.log('✅ tsconfig.json created');
  } else {
    console.log('ℹ️ tsconfig.json already exists, skipping');
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
  console.log('✅ vitest.config.ts created');
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

  console.log(`✅ Schema generation script created at: ${schemaScriptPath}`);
}

async function installDependenciesAndGenerateSchema(serverDir: string, workingDir: string): Promise<void> {
  console.log('📦 Installing dependencies...');

  try {
    await execa('pnpm', ['install'], { cwd: serverDir });
    console.log('✅ Dependencies installed successfully');

    console.log('🔄 Generating GraphQL schema...');
    await execa('tsx', ['scripts/generate-schema.ts'], { cwd: serverDir });

    const schemaPath = join(workingDir, '.context', 'schema.graphql');
    console.log(`✅ GraphQL schema generated at: ${schemaPath}`);
  } catch (error) {
    console.warn(
      `⚠️  Failed to install dependencies or generate schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    console.warn('You can manually run: cd server && pnpm install && npx tsx generate-schema.ts');
  }
}
