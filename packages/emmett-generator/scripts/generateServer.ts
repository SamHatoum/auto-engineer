import 'reflect-metadata';
import fs from 'fs-extra';
import * as path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { generateScaffoldFilePlans, writeScaffoldFilePlans } from '../src/codegen/scaffoldFromSchema';
import { ensureDirExists } from '../src/codegen/utils/path';
import { SpecsSchemaType } from '@auto-engineer/flowlang';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execa } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const [, , schemaPath, destination] = process.argv;

  if (!schemaPath || !destination) {
    console.error('Usage: pnpm generate:server path/to/schema.json path/to/output-dir');
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
  if (await fs.pathExists(serverDir)) {
    console.log('🧹 Removing existing server directory...');
    await fs.remove(serverDir);
  }

  await ensureDirExists(serverDir);

  const filePlans = await generateScaffoldFilePlans(
    spec.flows,
    spec.messages,
    join(serverDir, 'src', 'domain', 'flows'),
  );
  await writeScaffoldFilePlans(filePlans);
  await copySharedAndRootFiles(join(__dirname, '../src/domain'), join(serverDir, 'src/domain'));
  await copySharedAndRootFiles(join(__dirname, '../src'), join(serverDir, 'src'));
  await fs.copy(join(__dirname, '../src/utils'), join(serverDir, 'src/utils'));
  await writeTsconfigAndPackage(serverDir);

  await generateSchemaScript(serverDir, absDest);

  console.log(`✅ Server scaffold generated at: ${serverDir}`);

  await installDependenciesAndGenerateSchema(serverDir, absDest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

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

async function writeTsconfigAndPackage(dest: string): Promise<void> {
  const currentPackageJsonPath = path.join(__dirname, '..', 'package.json');
  const currentPackageJson = await fs.readJson(currentPackageJsonPath);

  const { dependencies: currentDeps = {}, devDependencies: currentDevDeps = {} } = currentPackageJson;

  const dependenciesToInclude = [
    '@event-driven-io/emmett',
    'type-graphql',
    'graphql',
    'fast-glob',
    'reflect-metadata',
    'zod',
  ];

  const devDependenciesToInclude = ['typescript', 'vitest', 'tsx'];

  const packageJson = {
    name: 'generated-server',
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      start: 'tsx src/server.ts',
      typecheck: 'tsc --noEmit',
      test: 'vitest run',
      dev: 'tsx src/server.ts',
    },
    dependencies: Object.fromEntries(
      dependenciesToInclude.filter((dep) => currentDeps[dep]).map((dep) => [dep, currentDeps[dep]]),
    ),
    devDependencies: Object.fromEntries(
      devDependenciesToInclude.filter((dep) => currentDevDeps[dep]).map((dep) => [dep, currentDevDeps[dep]]),
    ),
  };

  await fs.writeJson(path.join(dest, 'package.json'), packageJson, { spaces: 2 });

  const tsconfig = {
    compilerOptions: {
      target: 'esnext',
      module: 'esnext',
      moduleResolution: 'node',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      allowSyntheticDefaultImports: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      types: ['vitest/globals'],
    },
    include: ['src/**/*.ts'],
  };

  await fs.writeJson(path.join(dest, 'tsconfig.json'), tsconfig, { spaces: 2 });
}

async function generateSchemaScript(serverDir: string, workingDir: string): Promise<void> {
  const contextDir = join(workingDir, 'context');
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
    
    const contextDir = path.resolve('../context');
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
    await execa('npm', ['install'], { cwd: serverDir });
    console.log('✅ Dependencies installed successfully');

    console.log('🔄 Generating GraphQL schema...');
    await execa('npx', ['tsx', 'scripts/generate-schema.ts'], { cwd: serverDir });

    const schemaPath = join(workingDir, 'context', 'schema.graphql');
    console.log(`✅ GraphQL schema generated at: ${schemaPath}`);
  } catch (error) {
    console.warn(
      `⚠️  Failed to install dependencies or generate schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    console.warn('You can manually run: cd server && npm install && npx tsx generate-schema.ts');
  }
}
