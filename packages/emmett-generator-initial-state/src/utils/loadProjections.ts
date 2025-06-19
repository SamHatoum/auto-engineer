import fg from 'fast-glob';
import path from 'path';
import type { ProjectionDefinition } from '@event-driven-io/emmett';

export async function loadProjections(): Promise<ProjectionDefinition[]> {
    const files = await fg('src/domain/slices/**/projection.{ts,js}', {
        absolute: true,
    });

    const modules = await Promise.all(
        files.map(async (file) => {
            const mod = await import(pathToFileUrl(file).href);
            return mod.default;
        })
    );

    return modules;
}

function pathToFileUrl(filePath: string): URL {
    const resolved = path.resolve(filePath);
    return new URL(`file://${resolved}`);
}