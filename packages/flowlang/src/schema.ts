import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const IntegrationSchema = z.object({
  name: z.string().describe('Integration name (e.g., MailChimp, Twilio)'),
  description: z.string().optional(),
  source: z.string().describe('integration module source (e.g., @auto-engineer/mailchimp-integration)')
}).describe('External service integration configuration');

const MessageFieldSchema = z.object({
  name: z.string(),
  type: z.string().describe('Field type (e.g., string, number, Date, UUID, etc.)'),
  required: z.boolean().default(true),
  description: z.string().optional(),
  defaultValue: z.any().optional().describe('Default value for optional fields')
}).describe('Field definition for a message');

const BaseMessageSchema = z.object({
  name: z.string().describe('Message name'),
  fields: z.array(MessageFieldSchema),
  description: z.string().optional(),
  metadata: z.object({
    version: z.number().default(1).describe('Version number for schema evolution')
  }).optional()
});

const CommandSchema = BaseMessageSchema.extend({
  type: z.literal('command'),
}).describe('Command that triggers state changes');

const EventSchema = BaseMessageSchema.extend({
  type: z.literal('event'),
  source: z.enum(['internal', 'external']).default('internal')
}).describe('Event representing something that has happened');

const StateSchema = BaseMessageSchema.extend({
  type: z.literal('state'),
}).describe('State/Read Model representing a view of data');

const MessageSchema = z.discriminatedUnion('type', [
  CommandSchema,
  EventSchema,
  StateSchema
]);

const EventExampleSchema = z.object({
  eventRef: z.string().describe('Reference to event message by name'),
  exampleData: z.record(z.any()).describe('Example data matching the event schema')
}).describe('Event example with reference and data');

const CommandExampleSchema = z.object({
  commandRef: z.string().describe('Reference to command message by name'),
  exampleData: z.record(z.any()).describe('Example data matching the command schema')
}).describe('Command example with reference and data');

const StateExampleSchema = z.object({
  stateRef: z.string().describe('Reference to state message by name'),
  exampleData: z.record(z.any()).describe('Example data matching the state schema')
}).describe('State example with reference and data');

const BaseSliceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  via: z.array(z.string()).optional().describe('Integration names used by this slice')
}).describe('Base properties shared by all slice types');

const CommandSliceSchema = BaseSliceSchema.extend({
  type: z.literal('command'),
  stream: z.string().describe('Stream pattern (e.g., listing-${id})').optional(),
  client: z.object({
    description: z.string(),
    specs: z.array(z.string()).describe('UI specifications (should statements)')
  }),
  server: z.object({
    description: z.string(),
    gwt: z.object({
      given: z.array(EventExampleSchema).describe('Given events').optional(),
      when: CommandExampleSchema.describe('When command is received'),
      then: z.array(EventExampleSchema).describe('Then emit events')
    })
  })
}).describe('Command slice handling user actions and business logic');

const QuerySliceSchema = BaseSliceSchema.extend({
  type: z.literal('query'),
  client: z.object({
    description: z.string(),
    specs: z.array(z.string()).describe('UI specifications (should statements)')
  }),
  request: z.string().describe('Query request (GraphQL, REST endpoint, or other query format)').optional(),
  server: z.object({
    description: z.string(),
    gwt: z.object({
      given: z.array(EventExampleSchema).describe('Given events'),
      then: z.array(StateExampleSchema).describe('Then update state')
    })
  })
}).describe('Query slice for reading data and maintaining projections');

const ReactSliceSchema = BaseSliceSchema.extend({
  type: z.literal('react'),
  server: z.object({
    description: z.string(),
    gwt: z.object({
      when: z.array(EventExampleSchema).describe('When event(s) occur'),
      then: z.array(CommandExampleSchema).describe('Then send command(s)'),
    })
  })
}).describe('React slice for automated responses to events');

const SliceSchema = z.discriminatedUnion('type', [
  CommandSliceSchema,
  QuerySliceSchema,
  ReactSliceSchema
]);

const FlowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  slices: z.array(SliceSchema),
}).describe('Business flow containing related slices');


// Variant 1: Just flow names
const FlowNamesOnlySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
}).describe('Flow with just name for initial planning');

// Variant 2: Flow with slice names
const SliceNamesOnlySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['command', 'query', 'react']),
}).describe('Slice with just name and type for structure planning');

const FlowWithSliceNamesSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  slices: z.array(SliceNamesOnlySchema)
}).describe('Flow with slice names for structure planning');

// Variant 3: Flow with client & server names
const ClientServerNamesSliceSchema = z.object({
  name: z.string(),
  type: z.enum(['command', 'query', 'react']),
  description: z.string().optional(),
  client: z.object({
    description: z.string()
  }).optional(),
  server: z.object({
    description: z.string()
  }).optional()
}).describe('Slice with client/server descriptions for behavior planning');

const FlowWithClientServerNamesSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  slices: z.array(ClientServerNamesSliceSchema)
}).describe('Flow with client/server descriptions for behavior planning');

// Variant 4: Full specs (uses existing schemas)

// Export individual variant schemas
export const FlowNamesSchema = z.object({
  variant: z.literal('flow-names').describe('Just flow names for initial ideation'),
  flows: z.array(FlowNamesOnlySchema)
}).describe('System with just flow names for initial planning');

export const SliceNamesSchema = z.object({
  variant: z.literal('slice-names').describe('Flows with slice names for structure planning'),
  flows: z.array(FlowWithSliceNamesSchema)
}).describe('System with flow and slice names for structure planning');

export const ClientServerNamesSchema = z.object({
  variant: z.literal('client-server-names').describe('Flows with client/server descriptions'),
  flows: z.array(FlowWithClientServerNamesSchema)
}).describe('System with client/server descriptions for behavior planning');

export const SpecsSchema = z.object({
  variant: z.literal('specs').describe('Full specification with all details'),
  flows: z.array(FlowSchema),
  messages: z.array(MessageSchema),
  integrations: z.array(IntegrationSchema).optional()
}).describe('Complete system specification with all implementation details');

export const AppSchema = z.discriminatedUnion('variant', [
  FlowNamesSchema,
  SliceNamesSchema,
  ClientServerNamesSchema,
  SpecsSchema
]).describe('Progressive system definition supporting incremental co-creation');

if (require.main === module) {
  const schemas = Object.fromEntries(
    Object.entries({
      flow: FlowSchema,
      message: MessageSchema,
      integration: IntegrationSchema,
      commandSlice: CommandSliceSchema,
      querySlice: QuerySliceSchema,
      reactSlice: ReactSliceSchema,
    }).map(([k, v]) => [
      k,
      zodToJsonSchema(v, {
        $refStrategy: 'root' as const,
        target: 'jsonSchema7' as const,
        definitionPath: 'definitions',
        name: k[0].toUpperCase() + k.slice(1)
      })
    ])
  );
  console.log(JSON.stringify(schemas, null, 2));
}

export type MessageField = z.infer<typeof MessageFieldSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Integration = z.infer<typeof IntegrationSchema>;
export type Command = z.infer<typeof CommandSchema>;
export type Event = z.infer<typeof EventSchema>;
export type State = z.infer<typeof StateSchema>;
export type CommandExample = z.infer<typeof CommandExampleSchema>;
export type EventExample = z.infer<typeof EventExampleSchema>;
export type StateExample = z.infer<typeof StateExampleSchema>;
export type CommandSlice = z.infer<typeof CommandSliceSchema>;
export type QuerySlice = z.infer<typeof QuerySliceSchema>;
export type ReactSlice = z.infer<typeof ReactSliceSchema>;
export type Slice = z.infer<typeof SliceSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type FlowNamesSchema = z.infer<typeof FlowNamesSchema>;
export type SliceNamesSchema = z.infer<typeof SliceNamesSchema>;
export type ClientServerNamesSchema = z.infer<typeof ClientServerNamesSchema>;
export type SpecsSchema = z.infer<typeof SpecsSchema>;
export type AppSchema = z.infer<typeof AppSchema>;