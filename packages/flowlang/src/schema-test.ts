import { DataSinkSchema, DataSourceSchema, MessageTargetSchema } from './schema';
import { sink, source } from './data-flow-builders';

// Test that the builders produce output compatible with the schema
const testSink = sink().event('TestEvent').fields({ id: true }).toStream('test-${id}');

const testSource = source().state('TestState').fromProjection('TestProjection', 'id');

// Test new additionalInstructions functionality
const sinkWithInstructions = sink()
  .event('TestEvent')
  .additionalInstructions('Custom processing instructions')
  .toStream('test-${id}');

const sourceWithInstructions = source()
  .state('TestState')
  .additionalInstructions('Custom query instructions')
  .fromProjection('TestProjection', 'eventId');

// Test withState functionality for commands
const commandSinkWithState = sink()
  .command('TestCommand')
  .withState(testSource)
  .additionalInstructions('Process with state context')
  .toIntegration('TestIntegration', 'DoSomething', 'command');

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

console.log('\nTesting sink with additional instructions...');
const sinkWithInstructionsResult = DataSinkSchema.safeParse(sinkWithInstructions);
console.log('Sink with instructions valid:', sinkWithInstructionsResult.success);
if (!sinkWithInstructionsResult.success) {
  console.log('Sink with instructions errors:', sinkWithInstructionsResult.error);
}

console.log('\nTesting source with additional instructions...');
const sourceWithInstructionsResult = DataSourceSchema.safeParse(sourceWithInstructions);
console.log('Source with instructions valid:', sourceWithInstructionsResult.success);
if (!sourceWithInstructionsResult.success) {
  console.log('Source with instructions errors:', sourceWithInstructionsResult.error);
}

console.log('\nTesting command sink with state...');
const commandSinkWithStateResult = DataSinkSchema.safeParse(commandSinkWithState);
console.log('Command sink with state valid:', commandSinkWithStateResult.success);
if (!commandSinkWithStateResult.success) {
  console.log('Command sink with state errors:', commandSinkWithStateResult.error);
}
