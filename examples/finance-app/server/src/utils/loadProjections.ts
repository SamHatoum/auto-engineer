import fg from 'fast-glob';
import path from 'path';
import type { ProjectionDefinition } from '@event-driven-io/emmett';

export async function loadProjections(source: string): Promise<ProjectionDefinition[]> {
  const files = await fg(source, { absolute: true });

  const modules = await Promise.all(
    files.map(async (file) => {
      const mod: unknown = await import(pathToFileUrl(file).href);

      if (typeof mod === 'object' && mod !== null && 'projection' in mod) {
        const projectionModule = mod as { projection?: ProjectionDefinition };
        if (projectionModule.projection == null) {
          console.warn(`⚠️ Projection file "${file}" does not export "projection"`);
        }
        return projectionModule.projection;
      }
      console.warn(`⚠️ Projection file "${file}" does not export "projection"`);
      return undefined;
    }),
  );

  return modules.filter((p): p is ProjectionDefinition => p != null);
}

function pathToFileUrl(filePath: string): URL {
  const resolved = path.resolve(filePath);
  return new URL(`file://${resolved}`);
}
