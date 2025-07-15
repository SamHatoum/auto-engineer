import { DataSinkSchema, DataSourceSchema, MessageTargetSchema } from './schema';
import { sink, source } from './data-flow-builders';

// Test that the builders produce output compatible with the schema
const testSink = sink().event('TestEvent').fields({ id: true }).toStream('test-${id}');

const testSource = source().state('TestState').fromProjection('TestProjection');

console.log('Testing sink schema compatibility...');
const sinkResult = DataSinkSchema.safeParse(testSink);
console.log('Sink valid:', sinkResult.success);
if (!sinkResult.success) {
  console.log('Sink errors:', sinkResult.error);
}

console.log('Testing source schema compatibility...');
const sourceResult = DataSourceSchema.safeParse(testSource);
console.log('Source valid:', sourceResult.success);
if (!sourceResult.success) {
  console.log('Source errors:', sourceResult.error);
}

console.log('Testing message target schema compatibility...');
const targetResult = MessageTargetSchema.safeParse(testSink.target);
console.log('Target valid:', targetResult.success);
if (!targetResult.success) {
  console.log('Target errors:', targetResult.error);
}
