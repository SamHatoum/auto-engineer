import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import { GeneratedFile, IAScheme } from '../types';
import createDebug from 'debug';

const debug = createDebug('frontend-generator-react-graphql:generateComponents');
const debugTemplates = createDebug('frontend-generator-react-graphql:generateComponents:templates');
const debugOutput = createDebug('frontend-generator-react-graphql:generateComponents:output');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generate(spec: IAScheme): GeneratedFile[] {
  debug('Starting component generation');
  const files: GeneratedFile[] = [];

  debugTemplates('Loading templates from: %s/templates', __dirname);
  const componentTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/component.ejs'), 'utf-8');
  const pageTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/page.ejs'), 'utf-8');
  const appTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/app.ejs'), 'utf-8');
  debugTemplates('Templates loaded successfully');

  // Molecules
  debug('Generating %d molecule components', Object.keys(spec.molecules.items).length);
  for (const [name, def] of Object.entries(spec.molecules.items)) {
    debugOutput('Generating molecule: %s', name);
    const content = ejs.render(componentTemplate, {
      name,
      description: def.description,
      atoms: def.composition.atoms,
      molecules: [],
      organisms: [],
      specs: def.specs ?? [],
      dataRequirements: [],
    });
    files.push({
      path: `output/components/molecules/${name}.tsx`,
      content,
      type: 'molecule',
    });
  }

  // Organisms
  debug('Generating %d organism components', Object.keys(spec.organisms.items).length);
  for (const [name, def] of Object.entries(spec.organisms.items)) {
    debugOutput('Generating organism: %s', name);
    const content = ejs.render(componentTemplate, {
      name,
      description: def.description,
      atoms: [],
      molecules: def.composition.molecules,
      organisms: [],
      specs: def.specs ?? [],
      dataRequirements: def.data_requirements ?? [],
    });

    files.push({
      path: `output/components/organisms/${name}.tsx`,
      content,
      type: 'organism',
    });
  }

  // Pages
  debug('Generating %d page components', Object.keys(spec.pages.items).length);
  for (const [name, def] of Object.entries(spec.pages.items)) {
    debugOutput('Generating page: %s with route: %s', name, def.route);
    const content = ejs.render(pageTemplate, {
      name,
      description: def.description,
      organisms: def.layout.organisms,
      route: def.route,
      navigation: def.navigation ?? [],
      specs: def.specs ?? [],
      dataRequirements: def.data_requirements ?? [],
      template: def.template,
    });

    files.push({
      path: `output/pages/${name}.tsx`,
      content,
      type: 'page',
    });
  }

  // App.tsx
  debug('Generating App.tsx with %d pages', Object.keys(spec.pages.items).length);
  const appContent = ejs.render(appTemplate, {
    pages: Object.entries(spec.pages.items).map(([name, def]) => ({
      name,
      route: def.route,
    })),
  });

  files.push({
    path: 'output/App.tsx',
    content: appContent,
    type: 'app',
  });

  debug('Generation complete - generated %d files', files.length);
  return files;
}

function writeToDisk(files: GeneratedFile[]) {
  debugOutput('Writing %d files to disk', files.length);
  let filesWritten = 0;
  for (const file of files) {
    const fullPath = path.resolve(file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content);
    filesWritten++;
    debugOutput('Written file %d/%d: %s', filesWritten, files.length, file.path);
  }
  debugOutput('All files written successfully');
}

export function generateComponents(spec: IAScheme, basePath: string): GeneratedFile[] {
  debug('Starting generateComponents with basePath: %s', basePath);
  const allFiles = generate(spec);

  debug('Rewriting paths for %d files', allFiles.length);
  const rewritten = allFiles.map((file) => ({
    path: path.join(basePath, file.path.replace(/^output[\\/]/, '')),
    content: file.content,
    type: file.type,
  }));

  writeToDisk(rewritten);
  debug('Component generation complete');
  return rewritten;
}
