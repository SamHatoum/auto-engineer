import { glob } from 'fast-glob';

interface ResolverFunction {
  (...args: unknown[]): unknown;
}

export async function loadResolvers(source: string): Promise<[ResolverFunction, ...ResolverFunction[]]> {
    const files = await glob(source, {
        absolute: true,
    });
    const modules = await Promise.all(files.map((file) => import(file)));
    const allResolvers: ResolverFunction[] = [];
    
    for (const mod of modules) {
        for (const key of Object.keys(mod)) {
            const exported = (mod as Record<string, unknown>)[key];
            if (typeof exported === 'function') {
                allResolvers.push(exported as ResolverFunction);
            }
            if (Array.isArray(exported) && exported.every((r) => typeof r === 'function')) {
                allResolvers.push(...(exported as ResolverFunction[]));
            }
        }
    }
    
    if (allResolvers.length === 0) {
        throw new Error('❌ No resolvers found for any slices.');
    }
    return allResolvers as [ResolverFunction, ...ResolverFunction[]];
}