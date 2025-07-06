import fg from 'fast-glob';
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { registry } from './flow-registry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

export const getFlows = async () => {
    registry.clearAll();
    const files = await fg('**/*.flow.ts', {
        cwd: packageRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
    });

    console.log('[getFlows] searching in:', packageRoot);
    console.log('[getFlows] matched files:', files);

    await Promise.all(files.map((file) => import(pathToFileURL(file).href)));

    const flows = registry.getAllFlows();

    return {
        flows,
        toSchema: (): Record<string, unknown> => {
            const serialized = JSON.stringify(flows, (_key, val) => {
                if (val instanceof Date) {
                    return val.toISOString();
                }
                return val as unknown;
            });
            return JSON.parse(serialized) as Record<string, unknown>;
        },
    };
};