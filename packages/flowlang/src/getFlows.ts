import fg from 'fast-glob';
import { pathToFileURL } from 'url';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { registry } from './flow-registry';
import { SpecsSchema } from './schema';
import { z } from 'zod';
import {Flow, Message} from "./index";


const flowsToSchema = (flows: Flow[]): z.infer<typeof SpecsSchema> => {
  // Extract messages and integrations from flows
  const messages = new Map<string, Message>();
  const integrations = new Map<string, {
    name: string;
    description?: string;
    source: string;
  }>();

  flows.forEach(flow => {
    flow.slices.forEach(slice => {
      // Extract messages from GWT specs
      if ('server' in slice && slice.server?.gwt !== undefined) {
        slice.server.gwt.forEach(gwt => {
          // Process given
          if ('given' in gwt && gwt.given) {
            gwt.given.forEach(event => {
              if (!messages.has(event.eventRef)) {
                messages.set(event.eventRef, createMessage(event.eventRef, event.exampleData, 'event'));
              }
            });
          }

          // Process when
          if ('when' in gwt) {
            if ('commandRef' in gwt.when) {
              // Command slice
              if (!messages.has(gwt.when.commandRef)) {
                messages.set(gwt.when.commandRef, createMessage(gwt.when.commandRef, gwt.when.exampleData, 'command'));
              }
            } else if (Array.isArray(gwt.when)) {
              // React slice
              gwt.when.forEach(event => {
                if (!messages.has(event.eventRef)) {
                  messages.set(event.eventRef, createMessage(event.eventRef, event.exampleData, 'event'));
                }
              });
            }
          }

          // Process then
          if ('then' in gwt && gwt.then !== undefined) {
            gwt.then.forEach(item => {
              if ('eventRef' in item) {
                if (!messages.has(item.eventRef)) {
                  messages.set(item.eventRef, createMessage(item.eventRef, item.exampleData, 'event'));
                }
              } else if ('commandRef' in item) {
                if (!messages.has(item.commandRef)) {
                  messages.set(item.commandRef, createMessage(item.commandRef, item.exampleData, 'command'));
                }
              } else if ('stateRef' in item) {
                if (!messages.has(item.stateRef)) {
                  messages.set(item.stateRef, createMessage(item.stateRef, item.exampleData, 'state'));
                }
              }
            });
          }
        });
      }

      // Extract integrations from data
      if ('server' in slice && slice.server?.data !== undefined) {
        slice.server.data.forEach((dataItem) => {
          if ('destination' in dataItem && dataItem.destination.type === 'integration') {
            dataItem.destination.systems.forEach((system: string) => {
              if (!integrations.has(system)) {
                integrations.set(system, {
                  name: system,
                  description: `${system} integration`,
                  source: `@auto-engineer/${system.toLowerCase()}-integration`
                });
              }
            });
          }
        });
      }

      // Extract integrations from via
      if ('via' in slice && slice.via) {
        slice.via.forEach(integrationName => {
          if (!integrations.has(integrationName)) {
            integrations.set(integrationName, {
              name: integrationName,
              description: `${integrationName} integration`,
              source: `@auto-engineer/${integrationName.toLowerCase()}-integration`
            });
          }
        });
      }
    });
  });

  // Return the properly typed schema
  return {
    variant: 'specs' as const,
    flows: flows,
    messages: Array.from(messages.values()),
    integrations: Array.from(integrations.values())
  };
};

const createMessage = (
    name: string,
    data: Record<string, unknown>,
    messageType: 'command' | 'event' | 'state'
): Message => {
  // Infer fields from example data
  const fields = Object.entries(data).map(([fieldName, value]) => ({
    name: fieldName,
    type: inferType(value),
    required: true,
    description: undefined,
    defaultValue: undefined
  }));


  const metadata = { version: 1 };

  if (messageType === 'event') {
    return {
      type: 'event',
      name,
      fields,
      source: 'internal',
      metadata,
    };
  }

  if (messageType === 'command') {
    return {
      type: 'command',
      name,
      fields,
      metadata,
    };
  }

  return {
    type: 'state',
    name,
    fields,
    metadata,
  };
};

const inferType = (value: unknown): string => {
  if (value === null || value === undefined) return 'unknown';

  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
    return 'Date';
  }

  if (Array.isArray(value)) {
    return inferArrayType(value);
  }

  if (typeof value === 'object') {
    return inferObjectType(value as Record<string, unknown>);
  }

  return typeof value;
};

const inferArrayType = (value: unknown[]): string => {
  if (value.length === 0) return 'Array<unknown>';
  const itemType = inferType(value[0]);
  if (typeof value[0] === 'object' && !Array.isArray(value[0])) {
    const objType = Object.entries(value[0] as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${inferType(v)}`)
        .join(', ');
    return `Array<{${objType}}>`;
  }
  return `Array<${itemType}>`;
};

const inferObjectType = (value: Record<string, unknown>): string => {
  const objType = Object.entries(value)
      .map(([k, v]) => `${k}: ${inferType(v)}`)
      .join(', ');
  return `{${objType}}`;
};

export const getFlows = async (cwd: string = process.cwd()) => {
  registry.clearAll();

  const files = await fg('**/*.flow.ts', {
    cwd,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
  });

  console.log('[getFlows] searching in:', cwd);
  console.log('[getFlows] matched files:', files);

  await Promise.all(files.map((file) => import(pathToFileURL(file).href)));

  const flows = registry.getAllFlows();

  return {
    flows,
    toSchema: (): z.infer<typeof SpecsSchema> => flowsToSchema(flows),
  };
};

export const getFlow = async (filePath: string) => {
  registry.clearAll();

  const absolutePath = resolve(filePath);

  await import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`);

  const flows = registry.getAllFlows();

  return {
    flows,
    toSchema: (): z.infer<typeof SpecsSchema> => flowsToSchema(flows),
  };
};

export const convertFlowToJson = async (filePath: string, outputPath?: string): Promise<string> => {
  const result = await getFlow(filePath);
  const schema = result.toSchema();

  // Validate against SpecSchema
  try {
    SpecsSchema.parse(schema);
    // Validation passed - no console output needed
  } catch (error) {
    // Only log to stderr so it doesn't pollute stdout
    console.error('⚠ Schema validation failed:', error instanceof z.ZodError ? error.format() : error);
  }

  const json = JSON.stringify(schema, null, 2);

  if (outputPath !== undefined && outputPath !== null && outputPath.length > 0) {
    writeFileSync(outputPath, json);
    // Don't log here - this will be handled by the calling script
  }

  return json;
};