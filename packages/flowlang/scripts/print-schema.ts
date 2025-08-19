import {
  CommandSliceSchema,
  FlowSchema,
  IntegrationSchema,
  MessageSchema,
  QuerySliceSchema,
  ReactSliceSchema,
} from '../src';

import { zodToJsonSchema } from 'zod-to-json-schema';
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
      $refStrategy: 'root',
      target: 'jsonSchema7',
      definitionPath: 'definitions',
      name: k[0].toUpperCase() + k.slice(1),
    }),
  ]),
);

console.log(JSON.stringify(schemas, null, 2));
