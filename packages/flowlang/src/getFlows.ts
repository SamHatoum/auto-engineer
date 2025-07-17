import fg from 'fast-glob';
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';
import { registry } from './flow-registry';
import { SpecsSchema} from './schema';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

const flowsToSchema = (flows: unknown): Record<string, unknown> => {
  // First serialize to handle dates properly
  const serialized = JSON.stringify(flows, (_key, val) => {
    if (val instanceof Date) {
      return val.toISOString();
    }
    return val as unknown;
  });
  const parsedFlows = JSON.parse(serialized) as Array<{ name: string; slices: any[] }>;
  
  // Extract messages from flows
  const messages = new Map<string, any>();
  
  parsedFlows.forEach(flow => {
    flow.slices.forEach(slice => {
      // Check server specs for when/then messages
      const serverSpecs = slice.server?.specs || [];
      serverSpecs.forEach((spec: any) => {
        if (spec.when) {
          const message = extractMessage(spec.when, 'command');
          if (message) {
            messages.set(message.name, message);
          }
        }
        if (spec.then && Array.isArray(spec.then)) {
          spec.then.forEach((event: any) => {
            const message = extractMessage(event, 'event');
            if (message) {
              messages.set(message.name, message);
            }
          });
        }
        if (spec.given && Array.isArray(spec.given)) {
          spec.given.forEach((event: any) => {
            const message = extractMessage(event, 'event');
            if (message) {
              messages.set(message.name, message);
            }
          });
        }
      });
    });
  });
  
  // Transform flows to match FlowSchema format
  const transformedFlows = parsedFlows.map(flow => ({
    name: flow.name,
    description: (flow as any).description || undefined,
    slices: flow.slices.map(slice => {
      const baseSlice = {
        type: slice.type,
        name: slice.name,
        description: slice.description || undefined,
        stream: slice.stream || undefined,
        via: slice.via || undefined
      };
      
      if (slice.type === 'command') {
        return {
          ...baseSlice,
          client: {
            description: slice.client?.description || '',
            specs: extractSpecs(slice.client?.specs || [])
          },
          server: {
            description: slice.server?.description || '',
            gwt: transformSpecsToGwt(slice.server?.specs || []),
            data: slice.server?.data || undefined
          }
        };
      } else if (slice.type === 'query') {
        return {
          ...baseSlice,
          client: {
            description: slice.client?.description || '',
            specs: extractSpecs(slice.client?.specs || [])
          },
          request: slice.request || undefined,
          server: {
            description: slice.server?.description || '',
            gwt: transformQuerySpecsToGwt(slice.server?.specs || []),
            data: slice.server?.data || undefined
          }
        };
      } else if (slice.type === 'react') {
        return {
          ...baseSlice,
          server: {
            description: slice.server?.description || undefined,
            gwt: transformReactSpecsToGwt(slice.server?.specs || []),
            data: slice.server?.data || undefined
          }
        };
      }
      
      return baseSlice;
    })
  }));
  
  return {
    variant: 'specs',
    flows: transformedFlows,
    messages: Array.from(messages.values()),
    integrations: []
  };
};

const extractMessage = (messageData: any, messageType: 'command' | 'event' | 'state'): any | null => {
  if (!messageData || !messageData.type) return null;
  
  // Convert the message data to field format
  const fields = Object.entries(messageData.data || {}).map(([name, value]) => ({
    name,
    type: value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) ? 'Date' : 
          typeof value === 'string' ? 'string' : 
          typeof value === 'number' ? 'number' : 
          typeof value === 'boolean' ? 'boolean' : 
          'unknown',
    required: true,
    description: undefined,
    defaultValue: undefined
  }));
  
  const message: any = {
    type: messageType,
    name: messageData.type,
    fields,
    description: undefined,
    metadata: {
      version: 1
    }
  };
  
  if (messageType === 'event') {
    message.source = 'internal';
  }
  
  return message;
};

const extractSpecs = (specs: any[]): string[] => {
  return specs.flatMap(spec => {
    if (typeof spec === 'string') return [spec];
    if (spec.description) return [spec.description];
    if (spec.should && Array.isArray(spec.should)) return spec.should;
    return [];
  });
};

const transformSpecsToGwt = (specs: any[]): any[] => {
  return specs.map(spec => {
    if (spec.when && spec.then) {
      const gwtItem: any = {
        when: {
          commandRef: spec.when.type,
          exampleData: spec.when.data || {}
        },
        then: spec.then.map((event: any) => ({
          eventRef: event.type,
          exampleData: event.data || {}
        }))
      };
      
      if (spec.given) {
        gwtItem.given = spec.given.map((event: any) => ({
          eventRef: event.type,
          exampleData: event.data || {}
        }));
      }
      
      return gwtItem;
    }
    return {
      when: { commandRef: 'UnknownCommand', exampleData: {} },
      then: [{ eventRef: 'UnknownEvent', exampleData: {} }]
    };
  });
};

const transformQuerySpecsToGwt = (specs: any[]): any[] => {
  return specs.map(spec => {
    if (spec.given && spec.then) {
      return {
        given: spec.given.map((event: any) => ({
          eventRef: event.type,
          exampleData: event.data || {}
        })),
        then: spec.then.map((state: any) => ({
          stateRef: state.type,
          exampleData: state.data || {}
        }))
      };
    }
    return {
      given: [{ eventRef: 'UnknownEvent', exampleData: {} }],
      then: [{ stateRef: 'UnknownState', exampleData: {} }]
    };
  });
};

const transformReactSpecsToGwt = (specs: any[]): any[] => {
  return specs.map(spec => {
    if (spec.when && spec.then) {
      return {
        when: Array.isArray(spec.when) ? spec.when.map((event: any) => ({
          eventRef: event.type,
          exampleData: event.data || {}
        })) : [{
          eventRef: spec.when.type,
          exampleData: spec.when.data || {}
        }],
        then: spec.then.map((command: any) => ({
          commandRef: command.type,
          exampleData: command.data || {}
        }))
      };
    }
    return {
      when: [{ eventRef: 'UnknownEvent', exampleData: {} }],
      then: [{ commandRef: 'UnknownCommand', exampleData: {} }]
    };
  });
};

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
    toSchema: (): Record<string, unknown> => flowsToSchema(flows),
  };
};

export const getFlow = async (filePath: string) => {
  registry.clearAll();
  
  const absolutePath = resolve(filePath);

  await import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`);

  const flows = registry.getAllFlows();

  return {
    flows,
    toSchema: (): Record<string, unknown> => flowsToSchema(flows),
  };
};

export const convertFlowToJson = async (filePath: string, outputPath?: string): Promise<string> => {
  const result = await getFlow(filePath);
  const schema = result.toSchema();
  
  // Validate against SpecSchema
  try {
    SpecsSchema.parse(schema);
    console.error('✓ Schema validation passed');
  } catch (error) {
    console.error('⚠ Schema validation failed:', error instanceof z.ZodError ? error.format() : error);
  }
  
  const json = JSON.stringify(schema, null, 2);
  
  if (outputPath !== undefined && outputPath !== null && outputPath.length > 0) {
    writeFileSync(outputPath, json);
    console.log(`Flow converted to JSON and saved to: ${outputPath}`);
  }
  
  return json;
};
