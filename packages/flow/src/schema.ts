import { z } from 'zod';

const IntegrationSchema = z
  .object({
    name: z.string().describe('Integration name (e.g., MailChimp, Twilio)'),
    description: z.string().optional(),
    source: z.string().describe('integration module source (e.g., @auto-engineer/mailchimp-integration)'),
  })
  .describe('External service integration configuration');

// Data flow schemas for unified architecture
export const MessageTargetSchema = z
  .object({
    type: z.enum(['Event', 'Command', 'State']).describe('Type of message to target'),
    name: z.string().describe('Name of the specific message'),
    fields: z.record(z.unknown()).optional().describe('Field selector for partial message targeting'),
  })
  .describe('Target message with optional field selection');

const DestinationSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('stream'),
      pattern: z.string().describe('Stream pattern with interpolation (e.g., listing-${propertyId})'),
    }),
    z.object({
      type: z.literal('integration'),
      systems: z.array(z.string()).describe('Integration names to send to'),
      message: z
        .object({
          name: z.string(),
          type: z.enum(['command', 'query', 'reaction']),
        })
        .optional(),
    }),
    z.object({
      type: z.literal('database'),
      collection: z.string().describe('Database collection name'),
    }),
    z.object({
      type: z.literal('topic'),
      name: z.string().describe('Message topic/queue name'),
    }),
  ])
  .describe('Destination for outbound data');

const OriginSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('projection'),
      name: z.string(),
      idField: z.string().describe('Field from event used as the projection’s unique identifier'),
    }),
    z.object({
      type: z.literal('readModel'),
      name: z.string().describe('Read model name'),
    }),
    z.object({
      type: z.literal('database'),
      collection: z.string().describe('Database collection name'),
      query: z.unknown().optional().describe('Optional query filter'),
    }),
    z.object({
      type: z.literal('api'),
      endpoint: z.string().describe('API endpoint URL'),
      method: z.string().optional().describe('HTTP method (defaults to GET)'),
    }),
    z.object({
      type: z.literal('integration'),
      systems: z.array(z.string()),
    }),
  ])
  .describe('Origin for inbound data');

export const DataSinkSchema = z
  .object({
    target: MessageTargetSchema,
    destination: DestinationSchema,
    transform: z.string().optional().describe('Optional transformation function name'),
    _additionalInstructions: z.string().optional().describe('Additional instructions'),
    _withState: z
      .lazy(() => DataSourceSchema)
      .optional()
      .describe('Optional state data source for command'),
  })
  .describe('Data sink configuration for outbound data flow');

export const DataSourceSchema = z
  .object({
    target: MessageTargetSchema,
    origin: OriginSchema,
    transform: z.string().optional().describe('Optional transformation function name'),
    _additionalInstructions: z.string().optional().describe('Additional instructions'),
  })
  .describe('Data source configuration for inbound data flow');

const MessageFieldSchema = z
  .object({
    name: z.string(),
    type: z.string().describe('Field type (e.g., string, number, Date, UUID, etc.)'),
    required: z.boolean().default(true),
    description: z.string().optional(),
    defaultValue: z.unknown().optional().describe('Default value for optional fields'),
  })
  .describe('Field definition for a message');

const BaseMessageSchema = z.object({
  name: z.string().describe('Message name'),
  fields: z.array(MessageFieldSchema),
  description: z.string().optional(),
  metadata: z
    .object({
      version: z.number().default(1).describe('Version number for schema evolution'),
    })
    .optional(),
});

const CommandSchema = BaseMessageSchema.extend({
  type: z.literal('command'),
}).describe('Command that triggers state changes');

const EventSchema = BaseMessageSchema.extend({
  type: z.literal('event'),
  source: z.enum(['internal', 'external']).default('internal'),
}).describe('Event representing something that has happened');

const StateSchema = BaseMessageSchema.extend({
  type: z.literal('state'),
}).describe('State/Read Model representing a view of data');

const MessageSchema = z.discriminatedUnion('type', [CommandSchema, EventSchema, StateSchema]);

export const EventExampleSchema = z
  .object({
    eventRef: z.string().describe('Reference to event message by name'),
    exampleData: z.record(z.unknown()).describe('Example data matching the event schema'),
  })
  .describe('Event example with reference and data');

export const CommandExampleSchema = z
  .object({
    commandRef: z.string().describe('Reference to command message by name'),
    exampleData: z.record(z.unknown()).describe('Example data matching the command schema'),
  })
  .describe('Command example with reference and data');

const StateExampleSchema = z
  .object({
    stateRef: z.string().describe('Reference to state message by name'),
    exampleData: z.record(z.unknown()).describe('Example data matching the state schema'),
  })
  .describe('State example with reference and data');

const BaseSliceSchema = z
  .object({
    name: z.string(),
    id: z.string().optional().describe('Optional unique identifier for the slice'),
    description: z.string().optional(),
    stream: z.string().optional().describe('Event stream pattern for this slice'),
    via: z.array(z.string()).optional().describe('Integration names used by this slice'),
    additionalInstructions: z.string().optional().describe('Additional instructions'),
  })
  .describe('Base properties shared by all slice types');

const ErrorExampleSchema = z
  .object({
    errorType: z.enum(['IllegalStateError', 'ValidationError', 'NotFoundError']).describe('Expected error'),
    message: z.string().optional().describe('Optional error message'),
  })
  .describe('Error outcome');

const ExampleSchema = z
  .object({
    description: z.string().describe('Example description'),
    given: z
      .array(z.union([EventExampleSchema, StateExampleSchema]))
      .optional()
      .describe('Given conditions'),
    when: z.union([CommandExampleSchema, z.array(EventExampleSchema)]).describe('When action or events occur'),
    then: z
      .array(z.union([EventExampleSchema, StateExampleSchema, CommandExampleSchema, ErrorExampleSchema]))
      .describe('Then expected outcomes'),
  })
  .describe('BDD example with given-when-then structure');

const RuleSchema = z
  .object({
    description: z.string().describe('Rule description'),
    examples: z.array(ExampleSchema).describe('Examples demonstrating the rule'),
  })
  .describe('Business rule with examples');

const SpecSchema = z
  .object({
    name: z.string().describe('Spec name/feature name'),
    rules: z.array(RuleSchema).describe('Business rules for this spec'),
  })
  .describe('Specification with business rules');

const CommandSliceSchema = BaseSliceSchema.extend({
  type: z.literal('command'),
  client: z.object({
    description: z.string(),
    specs: z.array(z.string()).describe('UI specifications (should statements)'),
  }),
  request: z.string().describe('Command request (GraphQL, REST endpoint, or other query format)').optional(),
  server: z.object({
    description: z.string(),
    data: z.array(DataSinkSchema).optional().describe('Data sinks for command slices'),
    specs: SpecSchema.describe('Server-side specifications with rules and examples'),
  }),
}).describe('Command slice handling user actions and business logic');

const QuerySliceSchema = BaseSliceSchema.extend({
  type: z.literal('query'),
  client: z.object({
    description: z.string(),
    specs: z.array(z.string()).describe('UI specifications (should statements)'),
  }),
  request: z.string().describe('Query request (GraphQL, REST endpoint, or other query format)').optional(),
  server: z.object({
    description: z.string(),
    data: z.array(DataSourceSchema).optional().describe('Data sources for query slices'),
    specs: SpecSchema.describe('Server-side specifications with rules and examples'),
  }),
}).describe('Query slice for reading data and maintaining projections');

const ReactSliceSchema = BaseSliceSchema.extend({
  type: z.literal('react'),
  server: z.object({
    description: z.string().optional(),
    data: z
      .array(z.union([DataSinkSchema, DataSourceSchema]))
      .optional()
      .describe('Data items for react slices (mix of sinks and sources)'),
    specs: SpecSchema.describe('Server-side specifications with rules and examples'),
  }),
}).describe('React slice for automated responses to events');

const SliceSchema = z.discriminatedUnion('type', [CommandSliceSchema, QuerySliceSchema, ReactSliceSchema]);

const FlowSchema = z
  .object({
    name: z.string(),
    id: z.string().optional().describe('Optional unique identifier for the flow'),
    description: z.string().optional(),
    slices: z.array(SliceSchema),
  })
  .describe('Business flow containing related slices');

// Variant 1: Just flow names
const FlowNamesOnlySchema = z
  .object({
    name: z.string(),
    id: z.string().optional().describe('Optional unique identifier for the flow'),
    description: z.string().optional(),
  })
  .describe('Flow with just name for initial planning');

// Variant 2: Flow with slice names
const SliceNamesOnlySchema = z
  .object({
    name: z.string(),
    id: z.string().optional().describe('Optional unique identifier for the slice'),
    description: z.string().optional(),
    type: z.enum(['command', 'query', 'react']),
  })
  .describe('Slice with just name and type for structure planning');

const FlowWithSliceNamesSchema = z
  .object({
    name: z.string(),
    id: z.string().optional().describe('Optional unique identifier for the flow'),
    description: z.string().optional(),
    slices: z.array(SliceNamesOnlySchema),
  })
  .describe('Flow with slice names for structure planning');

// Variant 3: Flow with client & server names
const ClientServerNamesSliceSchema = z
  .object({
    name: z.string(),
    id: z.string().optional().describe('Optional unique identifier for the slice'),
    type: z.enum(['command', 'query', 'react']),
    description: z.string().optional(),
    client: z
      .object({
        description: z.string(),
      })
      .optional(),
    server: z
      .object({
        description: z.string(),
      })
      .optional(),
  })
  .describe('Slice with client/server descriptions for behavior planning');

const FlowWithClientServerNamesSchema = z
  .object({
    name: z.string(),
    id: z.string().optional().describe('Optional unique identifier for the flow'),
    description: z.string().optional(),
    slices: z.array(ClientServerNamesSliceSchema),
  })
  .describe('Flow with client/server descriptions for behavior planning');

// Variant 4: Full specs (uses existing schemas)

// Export individual variant schemas
export const FlowNamesSchema = z
  .object({
    variant: z.literal('flow-names').describe('Just flow names for initial ideation'),
    flows: z.array(FlowNamesOnlySchema),
  })
  .describe('System with just flow names for initial planning');

export const SliceNamesSchema = z
  .object({
    variant: z.literal('slice-names').describe('Flows with slice names for structure planning'),
    flows: z.array(FlowWithSliceNamesSchema),
  })
  .describe('System with flow and slice names for structure planning');

export const ClientServerNamesSchema = z
  .object({
    variant: z.literal('client-server-names').describe('Flows with client/server descriptions'),
    flows: z.array(FlowWithClientServerNamesSchema),
  })
  .describe('System with client/server descriptions for behavior planning');

export const SpecsSchema = z
  .object({
    variant: z.literal('specs').describe('Full specification with all details'),
    flows: z.array(FlowSchema),
    messages: z.array(MessageSchema),
    integrations: z.array(IntegrationSchema).optional(),
  })
  .describe('Complete system specification with all implementation details');

export const AppSchema = z
  .discriminatedUnion('variant', [FlowNamesSchema, SliceNamesSchema, ClientServerNamesSchema, SpecsSchema])
  .describe('Progressive system definition supporting incremental co-creation');

// if (require.main === module) {
//   const schemas = Object.fromEntries(
//     Object.entries({
//       flow: FlowSchema,
//       message: MessageSchema,
//       integration: IntegrationSchema,
//       commandSlice: CommandSliceSchema,
//       querySlice: QuerySliceSchema,
//       reactSlice: ReactSliceSchema,
//     }).map(([k, v]) => [
//       k,
//       zodToJsonSchema(v, {
//         $refStrategy: 'root' as const,
//         target: 'jsonSchema7' as const,
//         definitionPath: 'definitions',
//         name: k[0].toUpperCase() + k.slice(1),
//       }),
//     ]),
//   );
//   console.log(JSON.stringify(schemas, null, 2));
// }

// Re-export schemas for external usage
export {
  StateExampleSchema,
  MessageFieldSchema,
  ErrorExampleSchema,
  MessageSchema,
  CommandSchema,
  EventSchema,
  StateSchema,
  IntegrationSchema,
  CommandSliceSchema,
  QuerySliceSchema,
  ReactSliceSchema,
  SliceSchema,
  FlowSchema,
  ExampleSchema,
  RuleSchema,
  SpecSchema,
};
