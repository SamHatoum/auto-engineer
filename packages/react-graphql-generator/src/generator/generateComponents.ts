import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { GeneratedFile, IAScheme } from '../types';

function generate(spec: IAScheme): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  const componentTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/component.ejs'), 'utf-8');
  const pageTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/page.ejs'), 'utf-8');
  const appTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/app.ejs'), 'utf-8');

  // Molecules
  for (const [name, def] of Object.entries(spec.molecules.items)) {
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
    });
  }

  // Organisms
  for (const [name, def] of Object.entries(spec.organisms.items)) {
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
    });
  }

  // Pages
  for (const [name, def] of Object.entries(spec.pages.items)) {
    const content = ejs.render(pageTemplate, {
      name,
      description: def.description,
      organisms: def.layout.organisms,
      route: def.route,
      navigation: def.navigation ?? [],
      specs: def.specs ?? [],
      dataRequirements: def.data_requirements ?? [],
    });

    files.push({
      path: `output/pages/${name}.tsx`,
      content,
    });
  }

  // App.tsx
  const appContent = ejs.render(appTemplate, {
    pages: Object.entries(spec.pages.items).map(([name, def]) => ({
      name,
      route: def.route,
    })),
  });

  files.push({
    path: 'output/App.tsx',
    content: appContent,
  });

  return files;
}

function writeToDisk(files: GeneratedFile[]) {
  for (const file of files) {
    const fullPath = path.resolve(file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content);
  }
}

export function generateComponents(spec: IAScheme, basePath: string) {
  const allFiles = generate(spec);

  const rewritten = allFiles.map((file) => ({
    path: path.join(basePath, file.path.replace(/^output[\\/]/, '')),
    content: file.content,
  }));

  writeToDisk(rewritten);
}
