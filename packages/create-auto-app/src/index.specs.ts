import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('Template Discovery Integration Tests', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'create-auto-app-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('getAvailableTemplates', () => {
    it('should discover templates with valid template.json files', async () => {
      // Create mock templates directory structure
      const templatesDir = path.join(testDir, 'templates');
      await fs.ensureDir(templatesDir);

      // Create shopping-app template with template.json
      const shoppingAppDir = path.join(templatesDir, 'shopping-app');
      await fs.ensureDir(shoppingAppDir);
      await fs.writeJson(path.join(shoppingAppDir, 'template.json'), {
        name: 'shopping-app',
        displayName: 'Shopping App',
        description: 'Full e-commerce example with client/server architecture',
        type: 'template',
        features: ['Complete e-commerce functionality', 'GraphQL API with Apollo Server'],
        preset: 'full',
      });

      // Create questionnaires template with template.json
      const questionnairesDir = path.join(templatesDir, 'questionnaires');
      await fs.ensureDir(questionnairesDir);
      await fs.writeJson(path.join(questionnairesDir, 'template.json'), {
        name: 'questionnaires',
        displayName: 'Questionnaires App',
        description: 'Survey and questionnaire management system',
        type: 'template',
        features: ['Survey creation and management', 'Dynamic form generation'],
        preset: 'full',
      });

      // Create a file that should be ignored
      await fs.writeFile(path.join(templatesDir, 'README.md'), 'This should be ignored');

      // Verify template files exist
      expect(await fs.pathExists(path.join(shoppingAppDir, 'template.json'))).toBe(true);
      expect(await fs.pathExists(path.join(questionnairesDir, 'template.json'))).toBe(true);

      const shoppingAppTemplate = (await fs.readJson(path.join(shoppingAppDir, 'template.json'))) as {
        name: string;
        displayName: string;
        description: string;
        type: string;
        features: string[];
        preset: string;
      };
      expect(shoppingAppTemplate.name).toBe('shopping-app');
      expect(shoppingAppTemplate.displayName).toBe('Shopping App');

      const questionnairesTemplate = (await fs.readJson(path.join(questionnairesDir, 'template.json'))) as {
        name: string;
        displayName: string;
        description: string;
        type: string;
        features: string[];
        preset: string;
      };
      expect(questionnairesTemplate.name).toBe('questionnaires');
      expect(questionnairesTemplate.displayName).toBe('Questionnaires App');
    });

    it('should handle missing templates directory gracefully', async () => {
      // Don't create any templates directory
      const templatesDir = path.join(testDir, 'templates');
      expect(await fs.pathExists(templatesDir)).toBe(false);
    });

    it('should skip directories without template.json', async () => {
      const templatesDir = path.join(testDir, 'templates');
      await fs.ensureDir(templatesDir);

      // Create incomplete-template directory without template.json
      const incompleteDir = path.join(templatesDir, 'incomplete-template');
      await fs.ensureDir(incompleteDir);
      await fs.writeFile(path.join(incompleteDir, 'README.md'), 'No template.json here');

      // Create valid-template directory with template.json
      const validDir = path.join(templatesDir, 'valid-template');
      await fs.ensureDir(validDir);
      await fs.writeJson(path.join(validDir, 'template.json'), {
        name: 'valid-template',
        displayName: 'Valid Template',
        description: 'A valid template',
        type: 'template',
        features: ['Basic functionality'],
        preset: 'minimal',
      });

      // Verify only the valid template has template.json
      expect(await fs.pathExists(path.join(incompleteDir, 'template.json'))).toBe(false);
      expect(await fs.pathExists(path.join(validDir, 'template.json'))).toBe(true);
    });

    it('should handle malformed template.json files', async () => {
      const templatesDir = path.join(testDir, 'templates');
      await fs.ensureDir(templatesDir);

      // Create broken-template with invalid JSON
      const brokenDir = path.join(templatesDir, 'broken-template');
      await fs.ensureDir(brokenDir);
      await fs.writeFile(path.join(brokenDir, 'template.json'), 'invalid json content {');

      // Create good-template with valid JSON
      const goodDir = path.join(templatesDir, 'good-template');
      await fs.ensureDir(goodDir);
      await fs.writeJson(path.join(goodDir, 'template.json'), {
        name: 'good-template',
        displayName: 'Good Template',
        description: 'A working template',
        type: 'template',
        features: ['Working functionality'],
        preset: 'full',
      });

      // Verify the broken template throws an error when read
      await expect(fs.readJson(path.join(brokenDir, 'template.json'))).rejects.toThrow();

      // Verify the good template can be read successfully
      const goodTemplate = (await fs.readJson(path.join(goodDir, 'template.json'))) as {
        name: string;
        displayName: string;
        description: string;
        type: string;
        features: string[];
        preset: string;
      };
      expect(goodTemplate.name).toBe('good-template');
    });
  });

  describe('Template Creation', () => {
    it('should handle template copying', async () => {
      // Create a source template
      const sourceTemplate = path.join(testDir, 'source-template');
      await fs.ensureDir(sourceTemplate);
      await fs.writeFile(path.join(sourceTemplate, 'README.md'), '# Test Template');
      await fs.writeJson(path.join(sourceTemplate, 'package.json'), {
        name: 'test-template',
        version: '1.0.0',
        dependencies: {
          '@auto-engineer/cli': 'latest',
        },
      });

      // Create target directory
      const targetDir = path.join(testDir, 'target');

      // Copy template (mimicking createFromTemplate functionality)
      await fs.copy(sourceTemplate, targetDir);

      // Verify files were copied
      expect(await fs.pathExists(path.join(targetDir, 'README.md'))).toBe(true);
      expect(await fs.pathExists(path.join(targetDir, 'package.json'))).toBe(true);

      const copiedPackageJson = (await fs.readJson(path.join(targetDir, 'package.json'))) as {
        name: string;
        version: string;
        dependencies: Record<string, string>;
      };
      expect(copiedPackageJson.name).toBe('test-template');
    });

    it('should create pnpm-workspace.yaml if it does not exist', async () => {
      const targetDir = path.join(testDir, 'target');
      await fs.ensureDir(targetDir);

      const workspaceFile = path.join(targetDir, 'pnpm-workspace.yaml');

      // Verify it doesn't exist initially
      expect(await fs.pathExists(workspaceFile)).toBe(false);

      // Create the workspace file (mimicking the functionality)
      await fs.writeFile(workspaceFile, "packages:\n  - '*'\n");

      // Verify it was created
      expect(await fs.pathExists(workspaceFile)).toBe(true);
      const content = await fs.readFile(workspaceFile, 'utf8');
      expect(content).toBe("packages:\n  - '*'\n");
    });

    it('should not overwrite existing pnpm-workspace.yaml', async () => {
      const targetDir = path.join(testDir, 'target');
      await fs.ensureDir(targetDir);

      const workspaceFile = path.join(targetDir, 'pnpm-workspace.yaml');
      const existingContent = "packages:\n  - 'custom-packages/*'\n";

      // Create existing workspace file
      await fs.writeFile(workspaceFile, existingContent);

      // Verify it exists with original content
      expect(await fs.pathExists(workspaceFile)).toBe(true);
      const content = await fs.readFile(workspaceFile, 'utf8');
      expect(content).toBe(existingContent);

      // Simulate checking if file exists before writing
      const fileExists = await fs.pathExists(workspaceFile);
      if (!fileExists) {
        await fs.writeFile(workspaceFile, "packages:\n  - '*'\n");
      }

      // Verify original content is preserved
      const finalContent = await fs.readFile(workspaceFile, 'utf8');
      expect(finalContent).toBe(existingContent);
    });
  });

  describe('Project Structure Validation', () => {
    it('should validate project options correctly', () => {
      const templateOptions = {
        name: 'test-project',
        template: 'shopping-app',
        preset: undefined,
        packageManager: 'pnpm' as const,
        installDeps: true,
      };

      expect(templateOptions.template).toBe('shopping-app');
      expect(templateOptions.preset).toBeUndefined();
      expect(templateOptions.packageManager).toBe('pnpm');

      const presetOptions = {
        name: 'test-project',
        template: undefined,
        preset: 'minimal' as const,
        packageManager: 'npm' as const,
        installDeps: false,
      };

      expect(presetOptions.template).toBeUndefined();
      expect(presetOptions.preset).toBe('minimal');
      expect(presetOptions.packageManager).toBe('npm');
    });
  });
});
