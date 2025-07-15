import { glob } from 'fast-glob';

export interface Resolver {
  (...args: unknown[]): unknown;
}

export async function loadResolvers(source: string): Promise<Resolver[]> {
  //const files = await glob('src/graphql/{mutations,queries,resolvers}/**/*.ts');
  const files = await glob(source, {
    absolute: true,
  });
  const modules: unknown[] = await Promise.all(files.map((file) => import(file)));
  const allResolvers: Resolver[] = [];

  for (const mod of modules) {
    if (typeof mod !== 'object' || mod === null) {
      continue;
    }

    for (const key of Object.keys(mod)) {
      const exported = (mod as Record<string, unknown>)[key];

      if (typeof exported === 'function') {
        allResolvers.push(exported as Resolver);
      }

      if (Array.isArray(exported) && exported.every((r) => typeof r === 'function')) {
        allResolvers.push(...(exported as Resolver[]));
      }
    }
  }

  if (allResolvers.length === 0) {
    throw new Error('❌ No resolvers found for any slices.');
  }
  return allResolvers;
}
