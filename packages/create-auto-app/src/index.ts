#!/usr/bin/env node
import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateId } from '@auto-engineer/id';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProjectOptions {
  name: string;
  template?: string;
  preset?: 'minimal' | 'full';
  packageManager: 'npm' | 'pnpm' | 'yarn';
  installDeps: boolean;
}

interface TemplateMetadata {
  name: string;
  displayName: string;
  description: string;
  type: 'template';
  preset: 'minimal' | 'full';
}

const AUTO_ENGINEER_PACKAGES = [
  '@auto-engineer/message-bus',
  '@auto-engineer/server-checks',
  '@auto-engineer/design-system-importer',
  '@auto-engineer/server-generator-apollo-emmett',
  '@auto-engineer/flow',
  '@auto-engineer/frontend-checks',
  '@auto-engineer/frontend-implementer',
  '@auto-engineer/information-architect',
  '@auto-engineer/frontend-generator-react-graphql',
  '@auto-engineer/server-implementer',
];

const MINIMAL_PACKAGES = ['@auto-engineer/flow', '@auto-engineer/server-generator-apollo-emmett'];

async function detectPackageManager(): Promise<'npm' | 'pnpm' | 'yarn'> {
  try {
    await execa('pnpm', ['--version']);
    return 'pnpm';
  } catch {
    try {
      await execa('yarn', ['--version']);
      return 'yarn';
    } catch {
      return 'npm';
    }
  }
}

async function getLatestVersion(packageName: string): Promise<string> {
  try {
    const { stdout } = await execa('npm', ['view', packageName, 'version']);
    return `^${stdout.trim()}`;
  } catch {
    return 'latest';
  }
}

async function getLatestVersions(packages: string[]): Promise<Record<string, string>> {
  const spinner = ora('Fetching latest package versions...').start();
  const versions: Record<string, string> = {};

  await Promise.all(
    packages.map(async (pkg) => {
      versions[pkg] = await getLatestVersion(pkg);
    }),
  );

  // Always include CLI
  versions['@auto-engineer/cli'] = await getLatestVersion('@auto-engineer/cli');

  spinner.succeed('Package versions fetched');
  return versions;
}

async function updatePackageVersions(targetDir: string, projectName: string, versions: Record<string, string>) {
  const rootPackageJsonPath = path.join(targetDir, 'package.json');
  const clientPackageJsonPath = path.join(targetDir, 'client', 'package.json');
  const serverPackageJsonPath = path.join(targetDir, 'server', 'package.json');

  // Update root package.json
  if (await fs.pathExists(rootPackageJsonPath)) {
    const rootPkg = (await fs.readJson(rootPackageJsonPath)) as Record<string, unknown>;
    // Update dependencies
    if (rootPkg.dependencies !== undefined) {
      for (const [pkg, version] of Object.entries(versions)) {
        if ((rootPkg.dependencies as Record<string, string>)[pkg] !== undefined) {
          (rootPkg.dependencies as Record<string, string>)[pkg] = version;
        }
      }
    }
    // Update devDependencies
    if (rootPkg.devDependencies !== undefined) {
      for (const [pkg, version] of Object.entries(versions)) {
        if ((rootPkg.devDependencies as Record<string, string>)[pkg] !== undefined) {
          (rootPkg.devDependencies as Record<string, string>)[pkg] = version;
        }
      }
    }
    rootPkg.name = projectName;
    await fs.writeJson(rootPackageJsonPath, rootPkg, { spaces: 2 });
  }

  // Update client package.json if exists
  if (await fs.pathExists(clientPackageJsonPath)) {
    const clientPkg = (await fs.readJson(clientPackageJsonPath)) as Record<string, unknown>;
    clientPkg.name = `${projectName}-client`;
    await fs.writeJson(clientPackageJsonPath, clientPkg, { spaces: 2 });
  }

  // Update server package.json if exists
  if (await fs.pathExists(serverPackageJsonPath)) {
    const serverPkg = (await fs.readJson(serverPackageJsonPath)) as Record<string, unknown>;
    serverPkg.name = `${projectName}-server`;
    await fs.writeJson(serverPackageJsonPath, serverPkg, { spaces: 2 });
  }
}
async function installDependencies(targetDir: string, packageManager: 'npm' | 'pnpm' | 'yarn') {
  const spinner = ora('Installing dependencies...').start();
  try {
    // Install root dependencies
    await execa(packageManager, ['install'], { cwd: targetDir });

    // If it's a monorepo (has workspaces), pnpm install at root handles everything
    const rootPkg = (await fs.readJson(path.join(targetDir, 'package.json'))) as Record<string, unknown>;
    if (rootPkg.workspaces === undefined && rootPkg['pnpm-workspace.yaml'] === undefined) {
      // Install client dependencies if exists
      const clientDir = path.join(targetDir, 'client');
      if (await fs.pathExists(clientDir)) {
        await execa(packageManager, ['install'], { cwd: clientDir });
      }

      // Install server dependencies if exists
      const serverDir = path.join(targetDir, 'server');
      if (await fs.pathExists(serverDir)) {
        await execa(packageManager, ['install'], { cwd: serverDir });
      }
    }

    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    console.error(error);
  }
}

// Known bogus fileId patterns used in templates that should be replaced
const BOGUS_FILE_ID_PATTERNS = [
  'a1b2c3d4e', // questionnaires template
  'a2b2c2d2e', // shopping-app template
];

async function replaceBogusFileIds(targetDir: string): Promise<void> {
  const autoConfigPath = path.join(targetDir, 'auto.config.ts');

  if (!(await fs.pathExists(autoConfigPath))) {
    return; // No auto.config.ts file to process
  }

  try {
    const content = await fs.readFile(autoConfigPath, 'utf8');
    let modifiedContent = content;
    let hasReplacement = false;

    // Check if any bogus patterns exist and replace them
    for (const bogusPattern of BOGUS_FILE_ID_PATTERNS) {
      if (content.includes(bogusPattern)) {
        // Generate a new unique ID
        const newFileId = generateId();

        // Replace the bogus pattern with the new ID
        modifiedContent = modifiedContent.replace(
          new RegExp(`fileId:\\s*['"]${bogusPattern}['"]`, 'g'),
          `fileId: '${newFileId}'`,
        );

        hasReplacement = true;
        console.log(chalk.blue(`Replaced fileId ${bogusPattern} with ${newFileId} in auto.config.ts`));
        break; // Only replace the first match to avoid multiple replacements
      }
    }

    // Write back only if we made changes
    if (hasReplacement) {
      await fs.writeFile(autoConfigPath, modifiedContent, 'utf8');
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not process auto.config.ts fileId replacement:`, error));
    // Don't throw - this is not a critical failure
  }
}

async function createFromTemplate(templatePath: string, targetDir: string, projectName: string, templateName: string) {
  console.log(chalk.cyan(`Using ${templateName} template...`));
  try {
    // Copy without filter first to ensure it works
    await fs.copy(templatePath, targetDir);
  } catch (error) {
    console.error(chalk.red('Failed to copy template:'), error);
    throw error;
  }

  // Create pnpm-workspace.yaml if it doesn't exist (needed for monorepo setup)
  const workspaceYamlPath = path.join(targetDir, 'pnpm-workspace.yaml');
  if (!(await fs.pathExists(workspaceYamlPath))) {
    await fs.writeFile(workspaceYamlPath, "packages:\n  - '*'\n");
  }

  // Get latest versions for all packages
  const packagesToCheck = [...AUTO_ENGINEER_PACKAGES];
  const versions = await getLatestVersions(packagesToCheck);

  // Replace bogus fileId values in auto.config.ts files
  await replaceBogusFileIds(targetDir);

  // Update package versions
  await updatePackageVersions(targetDir, projectName, versions);
}

async function prepareTargetDirectory(name: string, targetDir: string): Promise<boolean> {
  // Check if directory exists (unless it's current directory)
  if (name !== '.' && (await fs.pathExists(targetDir))) {
    const { overwrite } = (await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${name} already exists. Overwrite?`,
        default: false,
      },
    ])) as { overwrite: boolean };

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled'));
      return false;
    }

    await fs.remove(targetDir);
  }

  // Create target directory
  try {
    await fs.ensureDir(targetDir);
    return true;
  } catch (error) {
    console.error(chalk.red('Failed to create directory:'), error);
    throw error;
  }
}

function printSuccessMessage(name: string, packageManager: string, installDeps: boolean) {
  console.log(chalk.green('\n✓ Project created successfully!\n'));
  console.log('Next steps:');
  if (name !== '.') {
    console.log(chalk.cyan(`  cd ${name}`));
  }
  if (!installDeps) {
    console.log(chalk.cyan(`  ${packageManager} install`));
  }
  console.log(chalk.cyan(`  ${packageManager} run start\n`));
}

async function getAvailableTemplates(): Promise<TemplateMetadata[]> {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const templates: TemplateMetadata[] = [];

  try {
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const templateJsonPath = path.join(templatesDir, entry.name, 'template.json');

        if (await fs.pathExists(templateJsonPath)) {
          try {
            const metadata = (await fs.readJson(templateJsonPath)) as TemplateMetadata;
            templates.push(metadata);
          } catch (error) {
            console.warn(chalk.yellow(`Failed to read template.json for ${entry.name}:`, error));
          }
        }
      }
    }
  } catch (error) {
    console.warn(chalk.yellow('Failed to read templates directory:', error));
  }

  return templates;
}

async function handleTemplateCreation(
  template: string | undefined,
  preset: 'minimal' | 'full' | undefined,
  targetDir: string,
  projectName: string,
  packageManager: string,
) {
  if (template !== undefined) {
    const templatePath = path.join(__dirname, '..', 'templates', template);

    if (await fs.pathExists(templatePath)) {
      await createFromTemplate(templatePath, targetDir, projectName, template);
    } else {
      console.log(chalk.yellow(`Template not found at ${templatePath}, creating minimal project...`));
      await createMinimalProject(targetDir, projectName, preset || 'minimal', packageManager);
    }
  } else {
    // Create project based on preset
    await createMinimalProject(targetDir, projectName, preset || 'minimal', packageManager);
  }
}

async function createProject(options: ProjectOptions) {
  const { name, template, preset, packageManager, installDeps } = options;
  const targetDir = path.resolve(process.cwd(), name === '.' ? process.cwd() : name);
  const projectName = name === '.' ? path.basename(process.cwd()) : name;

  // Prepare directory
  const shouldContinue = await prepareTargetDirectory(name, targetDir);
  if (!shouldContinue) {
    process.exit(0);
  }

  console.log(chalk.blue(`\nCreating Auto Engineer project in ${chalk.bold(targetDir)}\n`));

  // Handle template or preset creation
  await handleTemplateCreation(template, preset, targetDir, projectName, packageManager);

  // Install dependencies if requested
  if (installDeps) {
    await installDependencies(targetDir, packageManager);
  }

  // Success message
  printSuccessMessage(name, packageManager, installDeps);
}

async function createMinimalProject(
  targetDir: string,
  projectName: string,
  preset: 'minimal' | 'full',
  packageManager: string,
) {
  // Determine which packages to include
  const packagesToInclude = preset === 'full' ? AUTO_ENGINEER_PACKAGES : MINIMAL_PACKAGES;

  // Get latest versions
  const versions = await getLatestVersions(packagesToInclude);

  // Generate package.json
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'auto dev',
      build: 'auto build',
      test: 'auto test',
    },
    devDependencies: versions,
  };

  // Write package.json
  await fs.writeJson(path.join(targetDir, 'package.json'), packageJson, { spaces: 2 });

  // Create auto.config.ts
  const plugins = Object.keys(versions)
    .filter((pkg) => pkg !== '@auto-engineer/cli')
    .map((pkg) => `    '${pkg}',`)
    .join('\n');

  const autoConfig = `export default {
  plugins: [
${plugins}
  ],
};
`;

  await fs.writeFile(path.join(targetDir, 'auto.config.ts'), autoConfig);

  // Create basic directory structure
  await fs.ensureDir(path.join(targetDir, 'flows'));
  await fs.ensureDir(path.join(targetDir, '.context'));

  // Create .gitignore
  const gitignore = `node_modules
dist
.tmp
.env.local
*.log
.next
.turbo
`;
  await fs.writeFile(path.join(targetDir, '.gitignore'), gitignore);

  // Create README.md
  const readme = `# ${projectName}

An Auto Engineer project.

## Getting Started

\`\`\`bash
# Install dependencies
${packageManager} install

# Start development
${packageManager} run start
\`\`\`

## Available Commands

- \`auto generate:server\` - Generate server from flows
- \`auto generate:client\` - Generate client application
- \`auto check:frontend\` - Run frontend checks
- \`auto check:server\` - Run server checks

## Learn More

Visit [Auto Engineer Documentation](https://github.com/solguru310/auto-engineer) to learn more.
`;
  await fs.writeFile(path.join(targetDir, 'README.md'), readme);
}

async function main() {
  // Get available templates for help text
  const availableTemplates = await getAvailableTemplates();
  const templateNames = availableTemplates.map((t) => t.name).join(', ');

  program
    .name('create-auto-app')
    .description('Create a new Auto Engineer application')
    .version('0.1.0')
    .argument('[project-name]', 'Name of the project (use "." for current directory)')
    .option('-t, --template <template>', `Project template (${templateNames})`)
    .option('-p, --preset <preset>', 'Package preset (minimal, full)', 'full')
    .option('--no-install', 'Skip dependency installation')
    .option('--use-npm', 'Use npm as package manager')
    .option('--use-yarn', 'Use yarn as package manager')
    .option('--use-pnpm', 'Use pnpm as package manager')
    .parse(process.argv);

  const options = program.opts();
  let projectName = program.args[0];

  // Interactive mode if no project name provided
  if (!projectName) {
    // Build choices dynamically from available templates
    const templateChoices = availableTemplates.map((template) => ({
      name: `${template.displayName} - ${template.description}`,
      value: template.name,
    }));

    const setupChoices = [
      ...templateChoices,
      { name: 'Create minimal project (just essentials)', value: 'minimal' },
      { name: 'Create full project (all packages)', value: 'full' },
    ];

    const answers = (await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: 'my-auto-app',
        validate: (input: unknown) => {
          if (input === '.') return true;
          if (typeof input !== 'string' || !input.trim()) return 'Project name is required';
          if (!/^[a-z0-9-_]+$/i.test(input)) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'setupType',
        message: 'How would you like to set up your project?',
        choices: setupChoices,
        default: availableTemplates.length > 0 ? availableTemplates[0].name : 'minimal',
      },
      {
        type: 'confirm',
        name: 'installDeps',
        message: 'Install dependencies?',
        default: true,
      },
    ])) as {
      name: string;
      setupType: string;
      installDeps: boolean;
    };

    projectName = answers.name;
    const selectedTemplate = availableTemplates.find((t) => t.name === answers.setupType);
    if (selectedTemplate) {
      options.template = selectedTemplate.name;
      options.preset = undefined;
    } else {
      options.template = undefined;
      options.preset = answers.setupType as 'minimal' | 'full';
    }
    options.install = answers.installDeps;
  }

  // Detect package manager
  let packageManager: 'npm' | 'pnpm' | 'yarn';
  if (options.useNpm === true) {
    packageManager = 'npm';
  } else if (options.useYarn === true) {
    packageManager = 'yarn';
  } else if (options.usePnpm === true) {
    packageManager = 'pnpm';
  } else {
    packageManager = await detectPackageManager();
  }

  const projectOptions: ProjectOptions = {
    name: projectName,
    template: typeof options.template === 'string' ? options.template : undefined,
    preset: options.preset as 'minimal' | 'full' | undefined,
    packageManager,
    installDeps: options.install !== false,
  };

  await createProject(projectOptions);
}

// Only run main if this file is executed directly
if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  });
}

// Export functions for testing
export { getAvailableTemplates, createFromTemplate, detectPackageManager, replaceBogusFileIds };
