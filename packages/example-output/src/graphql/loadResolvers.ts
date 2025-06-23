import { glob } from 'fast-glob';
export async function getResolvers(): Promise<[Function, ...Function[]]> {
    const files = await glob('src/graphql/{mutations,queries,resolvers}/**/*.ts');

    const modules = await Promise.all(files.map((file) => import(`../../${file}`)));

    const allResolvers: Function[] = [];

    for (const mod of modules) {
        for (const key of Object.keys(mod)) {
            const exported = mod[key];
            if (typeof exported === 'function') {
                allResolvers.push(exported);
            }
            if (Array.isArray(exported) && exported.every((r) => typeof r === 'function')) {
                allResolvers.push(...exported);
            }
        }
    }

    if (allResolvers.length === 0) {
        throw new Error('❌ No resolvers found in graphql directory');
    }

    return allResolvers as [Function, ...Function[]];
}