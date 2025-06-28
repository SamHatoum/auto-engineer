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
  event: EventSchema.describe('Event message schema definition'),
  exampleData: z.record(z.any()).describe('Example data matching the event schema')
}).describe('Event example with schema and data');

const CommandExampleSchema = z.object({
  command: CommandSchema.describe('Command message schema definition'),
  exampleData: z.record(z.any()).describe('Example data matching the command schema')
}).describe('Command example with schema and data');

const StateExampleSchema = z.object({
  state: StateSchema.describe('State message schema definition'),
  exampleData: z.record(z.any()).describe('Example data matching the state schema')
}).describe('State example with schema and data');

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
      when: z.array(EventExampleSchema).describe('When events occur'),
      then: CommandExampleSchema.describe('Then send command')
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

export const SystemSchema = z.object({
  flows: z.array(FlowSchema),
  messages: z.array(MessageSchema),
  integrations: z.array(IntegrationSchema).optional()
}).describe('Complete system definition with flows, messages, and integrations');

if (require.main === module) {
  const schemas = Object.fromEntries(
    Object.entries({
      system: SystemSchema,
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
export type System = z.infer<typeof SystemSchema>;
