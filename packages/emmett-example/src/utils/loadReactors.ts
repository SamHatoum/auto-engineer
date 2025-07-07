import fg from 'fast-glob';
import path from 'path';
import type { EventStore, CommandSender } from '@event-driven-io/emmett';

export interface ReactorSetup {
    setup: (eventStore: EventStore, commandSender: CommandSender) => Promise<unknown>;
}

export async function loadReactors(source: string): Promise<ReactorSetup[]> {
    const files = await fg(source, {
        absolute: true,
    });
    console.log('🔍 Found workflow files:', files);
    const modules = await Promise.all(
        files.map(async (file) => {
            try {
                const mod: unknown = await import(pathToFileUrl(file).href);

                if (typeof mod === 'object' && mod !== null && 'setup' in mod && typeof (mod as ReactorSetup).setup === 'function') {
                  console.log('📦 Loaded module from', file, ':', Object.keys(mod));
                  return mod as ReactorSetup;
                }
                
                console.warn('⚠️ Reactor file', file, 'does not have a valid setup export');
                return null;
            } catch (error) {
                console.error('❌ Failed to import', file, ':', error);
                return null;
            }
        })
    );
    console.log('📋 All modules:', modules);
    const validModules = modules.filter((m): m is ReactorSetup => m !== null);
    console.log('⚙️ Found setups:', validModules.length);
    return validModules;
}

export async function setupReactors(
    workflows: ReactorSetup[],
    eventStore: EventStore,
    commandSender: CommandSender
): Promise<unknown[]> {
    console.log('🚀 Setting up', workflows.length, 'reactors');

    return Promise.all(
        workflows.map((workflow) => {
            return workflow.setup(eventStore, commandSender);
        })
    );
}

function pathToFileUrl(filePath: string): URL {
    const resolved = path.resolve(filePath);
    return new URL(`file://${resolved}`);
}