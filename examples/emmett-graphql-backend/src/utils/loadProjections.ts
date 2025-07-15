import fg from 'fast-glob';
import path from 'path';
import type { ProjectionDefinition } from '@event-driven-io/emmett';

interface ProjectionModule {
  projection: ProjectionDefinition;
}

export async function loadProjections(source: string): Promise<ProjectionDefinition[]> {
  const files = await fg(source, { absolute: true });

  const modules = await Promise.all(
    files.map(async (file) => {
      const mod = (await import(pathToFileUrl(file).href)) as Partial<ProjectionModule>;
      if (!mod.projection) {
        console.warn(`⚠️ Projection file "${file}" does not export "projection"`);
      }
      return mod.projection;
    }),
  );

  return modules.filter((p): p is ProjectionDefinition => p != null);
}

function pathToFileUrl(filePath: string): URL {
  const resolved = path.resolve(filePath);
  return new URL(`file://${resolved}`);
}
