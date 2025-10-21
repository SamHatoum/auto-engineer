import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import { GeneratedFile, IAScheme } from '../types';
import { extractTypeMappings, TypeMapping } from '../graphql-type-extractor';
import { buildTypeGuidance, aggregateOrganismGuidance } from './type-guidance-builder';
import createDebug from 'debug';

const debug = createDebug('auto:frontend-generator-react-graphql:generateComponents');
const debugTemplates = createDebug('auto:frontend-generator-react-graphql:generateComponents:templates');
const debugOutput = createDebug('auto:frontend-generator-react-graphql:generateComponents:output');
const debugTypes = createDebug('auto:frontend-generator-react-graphql:generateComponents:types');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractOrganismSpecs(spec: IAScheme, organismNames: string[]): Record<string, string[]> {
  const organismSpecs: Record<string, string[]> = {};
  for (const organismName of organismNames) {
    const organismDef = spec.organisms.items[organismName];
    if (organismDef !== undefined && organismDef.specs !== undefined) {
      organismSpecs[organismName] = organismDef.specs;
    }
  }
  return organismSpecs;
}

function generateMolecules(
  spec: IAScheme,
  componentTemplate: string,
  typeMappings: TypeMapping | undefined,
  files: GeneratedFile[],
): void {
  debug('Generating %d molecule components', Object.keys(spec.molecules.items).length);
  for (const [name, def] of Object.entries(spec.molecules.items)) {
    debugOutput('Generating molecule: %s', name);

    const typeGuidance = typeMappings
      ? buildTypeGuidance(name, def, typeMappings)
      : { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] };

    debugTypes(
      '%s (molecule): %d imports, %d query guidance, %d mutation guidance, %d enum guidance',
      name,
      typeGuidance.imports.length,
      typeGuidance.queryGuidance.length,
      typeGuidance.mutationGuidance.length,
      typeGuidance.enumGuidance.length,
    );

    const content = ejs.render(componentTemplate, {
      name,
      description: def.description,
      atoms: def.composition.atoms,
      molecules: [],
      organisms: [],
      specs: def.specs ?? [],
      dataRequirements: def.data_requirements ?? [],
      typeGuidance,
    });
    files.push({
      path: `output/components/molecules/${name}.tsx`,
      content,
      type: 'molecule',
    });
  }
}

function generateOrganisms(
  spec: IAScheme,
  componentTemplate: string,
  typeMappings: TypeMapping | undefined,
  files: GeneratedFile[],
): void {
  debug('Generating %d organism components', Object.keys(spec.organisms.items).length);
  for (const [name, def] of Object.entries(spec.organisms.items)) {
    debugOutput('Generating organism: %s', name);

    const typeGuidance = typeMappings
      ? buildTypeGuidance(name, def, typeMappings)
      : { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] };

    debugTypes(
      '%s: %d imports, %d query guidance, %d mutation guidance, %d enum guidance',
      name,
      typeGuidance.imports.length,
      typeGuidance.queryGuidance.length,
      typeGuidance.mutationGuidance.length,
      typeGuidance.enumGuidance.length,
    );

    const moleculeSpecs: Record<string, string[]> = {};
    for (const moleculeName of def.composition.molecules) {
      const moleculeDef = spec.molecules.items[moleculeName];
      if (moleculeDef !== undefined && moleculeDef.specs !== undefined) {
        moleculeSpecs[moleculeName] = moleculeDef.specs;
      }
    }

    const content = ejs.render(componentTemplate, {
      name,
      description: def.description,
      atoms: [],
      molecules: def.composition.molecules,
      organisms: [],
      specs: def.specs ?? [],
      dataRequirements: def.data_requirements ?? [],
      typeGuidance,
      moleculeSpecs,
    });

    files.push({
      path: `output/components/organisms/${name}.tsx`,
      content,
      type: 'organism',
    });
  }
}

function generatePages(
  spec: IAScheme,
  pageTemplate: string,
  typeMappings: TypeMapping | undefined,
  files: GeneratedFile[],
): void {
  debug('Generating %d page components', Object.keys(spec.pages.items).length);
  for (const [name, def] of Object.entries(spec.pages.items)) {
    debugOutput('Generating page: %s with route: %s', name, def.route);

    const pageTypeGuidance = typeMappings
      ? buildTypeGuidance(name, def, typeMappings)
      : { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] };

    const organismTypeGuidance = typeMappings
      ? aggregateOrganismGuidance(name, def, spec, typeMappings)
      : { imports: [], queryGuidance: [], mutationGuidance: [], enumGuidance: [] };

    const mergedImports = Array.from(new Set([...pageTypeGuidance.imports, ...organismTypeGuidance.imports]));
    const mergedQueryGuidance = [...pageTypeGuidance.queryGuidance, ...organismTypeGuidance.queryGuidance];
    const mergedMutationGuidance = [...pageTypeGuidance.mutationGuidance, ...organismTypeGuidance.mutationGuidance];
    const mergedEnumGuidance =
      pageTypeGuidance.enumGuidance.length > 0 ? pageTypeGuidance.enumGuidance : organismTypeGuidance.enumGuidance;

    const typeGuidance = {
      imports: mergedImports,
      queryGuidance: mergedQueryGuidance,
      mutationGuidance: mergedMutationGuidance,
      enumGuidance: mergedEnumGuidance,
    };

    debugTypes(
      '%s: %d imports (%d page + %d organisms), %d query guidance (%d page + %d organisms), %d mutation guidance (%d page + %d organisms), %d enum guidance',
      name,
      typeGuidance.imports.length,
      pageTypeGuidance.imports.length,
      organismTypeGuidance.imports.length,
      typeGuidance.queryGuidance.length,
      pageTypeGuidance.queryGuidance.length,
      organismTypeGuidance.queryGuidance.length,
      typeGuidance.mutationGuidance.length,
      pageTypeGuidance.mutationGuidance.length,
      organismTypeGuidance.mutationGuidance.length,
      typeGuidance.enumGuidance.length,
    );

    const organismSpecs = extractOrganismSpecs(spec, def.layout.organisms);

    const content = ejs.render(pageTemplate, {
      name,
      description: def.description,
      organisms: def.layout.organisms,
      route: def.route,
      navigation: def.navigation ?? [],
      specs: def.specs ?? [],
      dataRequirements: def.data_requirements ?? [],
      template: def.template,
      typeGuidance,
      organismSpecs,
    });

    files.push({
      path: `output/pages/${name}.tsx`,
      content,
      type: 'page',
    });
  }
}

function generate(spec: IAScheme, gqlSchemaContent?: string): GeneratedFile[] {
  debug('Starting component generation');
  const files: GeneratedFile[] = [];

  let typeMappings: TypeMapping | undefined;
  if (gqlSchemaContent !== undefined && gqlSchemaContent !== '') {
    debugTypes('Extracting type mappings from GraphQL schema');
    typeMappings = extractTypeMappings(gqlSchemaContent);
    debugTypes(
      'Extracted %d query mappings, %d mutation mappings',
      typeMappings.queries.size,
      typeMappings.mutations.size,
    );
  } else {
    debugTypes('No GraphQL schema provided, skipping type guidance');
  }

  debugTemplates('Loading templates from: %s/templates', __dirname);
  const componentTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/component.ejs'), 'utf-8');
  const pageTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/page.ejs'), 'utf-8');
  const appTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/app.ejs'), 'utf-8');
  debugTemplates('Templates loaded successfully');

  generateMolecules(spec, componentTemplate, typeMappings, files);
  generateOrganisms(spec, componentTemplate, typeMappings, files);
  generatePages(spec, pageTemplate, typeMappings, files);

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

export function generateComponents(spec: IAScheme, basePath: string, gqlSchemaContent?: string): GeneratedFile[] {
  debug('Starting generateComponents with basePath: %s', basePath);
  const allFiles = generate(spec, gqlSchemaContent);

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
