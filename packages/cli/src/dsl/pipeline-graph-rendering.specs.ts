import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageBusServer } from '../server/server';
import { on, dispatch, getRegistrations, getPipelineGraph } from './index';
import { PluginLoader } from '../plugin-loader';
import type { CommandMetadataService } from '../server/command-metadata-service';
import getPort from 'get-port';
import path from 'path';

/**
 * Integration test to verify pipeline graph generation from various DSL configurations
 * Tests that different DSL patterns (on/dispatch, on.settled) render correctly with real plugins
 */
describe('Pipeline Graph Rendering Integration', () => {
  let server: MessageBusServer;
  let port: number;

  beforeEach(async () => {
    // Clear any existing registrations
    getRegistrations();

    port = await getPort();
    server = new MessageBusServer({
      port,
      enableFileSync: false,
    });
  });

  afterEach(async () => {
    // Clear registrations after each test
    getRegistrations();
    await server?.stop?.();
  });

  // Helper to set up real plugin loading
  async function setupRealPlugins(): Promise<CommandMetadataService | undefined> {
    // Use the working questionnaires config instead of creating a temp one
    const questionnairesConfigPath = path.resolve(__dirname, '../../../../examples/questionnaires/auto.config.ts');

    // Change to monorepo root so plugin loader can find package.json files
    const originalCwd = process.cwd();
    const monorepoRoot = path.resolve(__dirname, '../../../..');
    process.chdir(monorepoRoot);
    // Load real plugins and register with server
    const pluginLoader = new PluginLoader();
    await pluginLoader.loadPlugins(questionnairesConfigPath);

    const unifiedHandlers = pluginLoader.getUnifiedHandlers();
    const commandHandlers = Array.from(unifiedHandlers.values());
    server.registerCommandHandlers(commandHandlers);

    // Get metadata service using the proper server method
    const metadataService = server.getCommandMetadataService();

    // Restore original working directory
    process.chdir(originalCwd);

    return metadataService;
  }

  it('should reproduce questionnaires config pattern with multiple handlers for same event', async () => {
    const metadataService = await setupRealPlugins();

    // Manually recreate the questionnaires pipeline pattern from the config
    // This reproduces the exact pattern from auto.config.ts where ServerGenerated has TWO handlers

    // First handler: ServerGenerated -> ImplementSlice (line 42)
    on('ServerGenerated', () =>
      dispatch('ImplementSlice', {
        slicePath: 'string',
        context: {
          previousOutputs: 'errors',
          attemptNumber: 0,
        },
      }),
    );

    // Second handler: ServerGenerated -> GenerateIA (line 89)
    on('ServerGenerated', () =>
      dispatch('GenerateIA', {
        outputDir: './.context',
        flowFiles: ['./flows/questionnaires.flow.ts'],
      }),
    );

    const graph = await getPipelineGraph({ metadataService });

    // Check the critical edges from your screenshot - BOTH should exist
    const serverToSliceEdge = graph.edges.find(
      (e) =>
        e.from === '@auto-engineer/server-generator-apollo-emmett/generate:server' &&
        e.to === '@auto-engineer/server-implementer/implement:slice',
    );

    const serverToIAEdge = graph.edges.find(
      (e) =>
        e.from === '@auto-engineer/server-generator-apollo-emmett/generate:server' &&
        e.to === '@auto-engineer/information-architect/generate:ia',
    );

    console.log('🔍 GenerateServer -> ImplementSlice edge exists:', !!serverToSliceEdge);
    console.log('🔍 GenerateServer -> GenerateIA edge exists:', !!serverToIAEdge);

    // Both edges should exist since we have multiple handlers for ServerGenerated
    expect(serverToSliceEdge, 'Missing GenerateServer -> ImplementSlice edge').toBeDefined();
    expect(serverToIAEdge, 'Missing GenerateServer -> GenerateIA edge').toBeDefined();
  });

  it('should only show edges and nodes that are actually registered when using DSL registrations', async () => {
    const metadataService = await setupRealPlugins();

    // Recreate the CURRENT questionnaires config where GenerateIA handler is commented out
    // Only register the ServerGenerated -> ImplementSlice handler
    on('ServerGenerated', () =>
      dispatch('ImplementSlice', {
        slicePath: './server/src/domain/flows/questionnaires/submits-a-questionnaire-answer',
        context: {
          previousOutputs: 'errors',
          attemptNumber: 0,
        },
      }),
    );

    const graph = await getPipelineGraph({ metadataService });

    console.log('🔍 DSL REGISTRATIONS PATH (GenerateIA commented out):');
    console.log(
      'Nodes:',
      graph.nodes.map((n) => n.id),
    );
    console.log('Edges:', graph.edges);

    // Should have ImplementSlice edge since it's actually registered
    const serverToSliceEdge = graph.edges.find(
      (e) =>
        e.from === '@auto-engineer/server-generator-apollo-emmett/generate:server' &&
        e.to === '@auto-engineer/server-implementer/implement:slice',
    );

    // Should NOT have GenerateIA edge since the handler is commented out
    const serverToIAEdge = graph.edges.find(
      (e) =>
        e.from === '@auto-engineer/server-generator-apollo-emmett/generate:server' &&
        e.to === '@auto-engineer/information-architect/generate:ia',
    );

    // Should NOT have GenerateIA node since it's not dispatched anywhere
    const generateIANode = graph.nodes.find((n) => n.id === '@auto-engineer/information-architect/generate:ia');

    console.log('🔍 GenerateServer -> ImplementSlice edge exists:', !!serverToSliceEdge);
    console.log('🔍 GenerateServer -> GenerateIA edge exists (should be false):', !!serverToIAEdge);
    console.log('🔍 GenerateIA node exists (should be false):', !!generateIANode);

    // Only the actually registered edge should exist
    expect(serverToSliceEdge, 'Missing GenerateServer -> ImplementSlice edge').toBeDefined();

    // These should NOT exist since GenerateIA handler is commented out
    expect(serverToIAEdge, 'GenerateIA edge should not exist when handler is commented out').toBeUndefined();
    expect(generateIANode, 'GenerateIA node should not exist when not dispatched').toBeUndefined();
  });

  it('should correctly handle eventHandlers path with no hardcoded mappings', async () => {
    const metadataService = await setupRealPlugins();

    // Create a fake eventHandlers map - this simulates production
    const eventHandlers = new Map();
    eventHandlers.set('ServerGenerated', [
      () => {
        /* handler for ImplementSlice */
      },
    ]);

    const graph = await getPipelineGraph({
      metadataService,
      eventHandlers,
    });

    console.log('✅ FIXED: EventHandlers path without hardcoded mappings:');
    console.log(
      'Nodes:',
      graph.nodes.map((n) => n.id),
    );
    console.log('Edges:', graph.edges);

    // With eventHandlers path, we should only get source nodes, no edges
    // because we can't determine targets without analyzing dispatch calls
    expect(graph.nodes.length).toBeGreaterThan(0); // Should have GenerateServer node
    expect(graph.edges.length).toBe(0); // Should have no edges since we can't determine targets

    // Should NOT have any edges to GenerateIA since no hardcoded mapping exists
    const serverToIAEdge = graph.edges.find(
      (e) =>
        e.from === '@auto-engineer/server-generator-apollo-emmett/generate:server' &&
        e.to === '@auto-engineer/information-architect/generate:ia',
    );

    const generateIANode = graph.nodes.find((n) => n.id === '@auto-engineer/information-architect/generate:ia');

    expect(serverToIAEdge, 'No hardcoded edges should exist').toBeUndefined();
    expect(generateIANode, 'No hardcoded nodes should exist').toBeUndefined();
  });

  it('should render on.settled configuration with multiple commands branching to single node', async () => {
    const metadataService = await setupRealPlugins();

    // Test simpler on.settled pattern where the target commands are known statically
    // This test verifies that source commands are registered even without target edges
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (on as any).settled(['CheckTests', 'CheckTypes', 'CheckLint'], () => {
      // This lambda function approach doesn't populate registration.dispatches
      // but should still register the source commands as nodes
    });

    const graph = await getPipelineGraph({ metadataService });

    const nodeIds = graph.nodes.map((n) => n.id);

    // Should have all check commands with canonical IDs (source nodes from on.settled)
    expect(nodeIds).toContain('@auto-engineer/server-checks/check:tests');
    expect(nodeIds).toContain('@auto-engineer/server-checks/check:types');
    expect(nodeIds).toContain('@auto-engineer/server-checks/check:lint');

    // Note: ImplementClient won't be included since the current on.settled implementation
    // doesn't parse dispatch calls from lambda functions into registration.dispatches
  });

  it('should render complex multi-stage pipeline with sequential and parallel branches correctly', async () => {
    const metadataService = await setupRealPlugins();

    // The full questionnaires pipeline configuration
    on('SchemaExported', () => dispatch('GenerateServer', { destination: '.' }));
    on('ServerGenerated', () => dispatch('ImplementSlice', { slicePath: './server' }));
    on('SliceImplemented', () => dispatch('GenerateIA', { outputDir: './.context' }));
    on('IAGenerated', () => dispatch('GenerateClient', { targetDir: './client' }));
    on('ClientGenerated', () => dispatch('ImplementClient', { projectDir: './client' }));

    // Add on.settled for checks
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (on as any).settled(['CheckTests', 'CheckTypes', 'CheckLint'], () => {
      dispatch('ImplementClient', { projectDir: './client', iaSchemeDir: './.context' });
    });

    const graph = await getPipelineGraph({ metadataService });

    console.log('🏗️ COMPLEX MULTI-STAGE PIPELINE:');
    console.log(JSON.stringify(graph, null, 2));

    // Verify all nodes have canonical IDs
    const nodeIds = graph.nodes.map((n) => n.id);
    expect(nodeIds.every((id) => id.includes('/'))).toBe(true); // All should have package/alias format

    // Verify main chain exists
    const mainChainEdges = [
      {
        from: '@auto-engineer/flow/export:schema',
        to: '@auto-engineer/server-generator-apollo-emmett/generate:server',
      },
      {
        from: '@auto-engineer/server-generator-apollo-emmett/generate:server',
        to: '@auto-engineer/server-implementer/implement:slice',
      },
      {
        from: '@auto-engineer/server-implementer/implement:slice',
        to: '@auto-engineer/information-architect/generate:ia',
      },
      {
        from: '@auto-engineer/information-architect/generate:ia',
        to: '@auto-engineer/frontend-generator-react-graphql/generate:client',
      },
      {
        from: '@auto-engineer/frontend-generator-react-graphql/generate:client',
        to: '@auto-engineer/frontend-implementer/implement:client',
      },
    ];

    for (const expectedEdge of mainChainEdges) {
      const edge = graph.edges.find((e) => e.from === expectedEdge.from && e.to === expectedEdge.to);
      expect(edge, `Missing edge: ${expectedEdge.from} -> ${expectedEdge.to}`).toBeDefined();
    }
  });

  it('should fallback to command names when metadataService is undefined', async () => {
    // Test the fallback behavior when no metadata is available
    on('ServerGenerated', () => dispatch('ImplementSlice', {}));

    // Generate pipeline graph WITHOUT metadata service
    const graph = await getPipelineGraph({
      metadataService: undefined,
      messageStore: undefined,
    });

    console.log('🔧 FALLBACK BEHAVIOR WITHOUT METADATA:');
    console.log(JSON.stringify(graph, null, 2));

    const nodeIds = graph.nodes.map((n) => n.id);

    // Without metadata, only dispatched commands become nodes (can't determine source commands)
    expect(nodeIds).toContain('ImplementSlice');
    // GenerateServer won't be a node because we can't determine it generates ServerGenerated without metadata

    // All nodes should be command names (no "/" in IDs)
    expect(nodeIds.every((id) => !id.includes('/'))).toBe(true);

    console.log('✅ Confirmed: Without metadata service, nodes use command names as fallback');
  });

  it('should handle fan-out pattern where one event triggers multiple commands', async () => {
    const metadataService = await setupRealPlugins();

    // Test the fan-out pattern: SliceImplemented triggers 3 different check commands
    on('SchemaExported', () => dispatch('GenerateServer', { schemaPath: './.context/schema.json', destination: '.' }));

    on('ServerGenerated', () =>
      dispatch('ImplementSlice', {
        slicePath: './server/src/domain/flows/questionnaires/submits-a-questionnaire-answer',
        context: { previousOutputs: 'errors', attemptNumber: 0 },
      }),
    );

    // Fan-out: SliceImplemented triggers 3 commands
    on('SliceImplemented', () =>
      dispatch('CheckTests', {
        targetDirectory: './server/src/domain/flows/questionnaires/submits-a-questionnaire-answer',
        scope: 'slice',
      }),
    );

    on('SliceImplemented', () =>
      dispatch('CheckTypes', {
        targetDirectory: './server/src/domain/flows/questionnaires/submits-a-questionnaire-answer',
        scope: 'slice',
      }),
    );

    on('SliceImplemented', () =>
      dispatch('CheckLint', {
        targetDirectory: './server/src/domain/flows/questionnaires/submits-a-questionnaire-answer',
        scope: 'slice',
        fix: true,
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (on as any).settled(['CheckTests', 'CheckTypes', 'CheckLint'], () => {
      // This represents the conditional retry logic from the real config
    });

    const graph = await getPipelineGraph({ metadataService });

    console.log('🌟 FAN-OUT PATTERN TEST:');
    console.log(JSON.stringify(graph, null, 2));

    // Verify the pipeline structure
    expect(graph.nodes.length).toBeGreaterThan(5);
    expect(graph.edges.length).toBeGreaterThan(3);

    // Should have all the expected command types
    const nodeNames = graph.nodes.map((n) => n.name);
    expect(nodeNames).toContain('GenerateServer');
    expect(nodeNames).toContain('ImplementSlice');
    expect(nodeNames).toContain('CheckTests');
    expect(nodeNames).toContain('CheckTypes');
    expect(nodeNames).toContain('CheckLint');

    // Verify fan-out edges: ImplementSlice should connect to all 3 check commands
    const implementSliceToChecks = graph.edges.filter(
      (e) =>
        e.from === '@auto-engineer/server-implementer/implement:slice' &&
        (e.to === '@auto-engineer/server-checks/check:tests' ||
          e.to === '@auto-engineer/server-checks/check:types' ||
          e.to === '@auto-engineer/server-checks/check:lint'),
    );

    expect(implementSliceToChecks.length).toBe(3);
    console.log('✅ Verified fan-out pattern: SliceImplemented → [CheckTests, CheckTypes, CheckLint]');
  });

  it('should show failed status when command emits events with error data', async () => {
    const metadataService = await setupRealPlugins();

    // Register a completely new command that fails
    server.registerCommandHandlers([
      {
        name: 'MockFailCommand',
        alias: 'mock:fail',
        description: 'Mock command that always fails',
        category: 'test',
        icon: 'x-circle',
        fields: {},
        examples: [],
        events: ['MockPassed', 'MockFailed'],
        handle: async () => {
          // This simulates a command that fails and emits an event with error data
          return {
            type: 'MockFailed',
            data: {
              error: 'Mock command intentionally failed for testing',
              details: 'This demonstrates the status bug',
              exitCode: 1,
            },
          };
        },
      },
    ]);

    // Set up DSL registration so the command appears in the graph
    on('SchemaExported', () => dispatch('MockFailCommand', {}));

    await server.start();
    const messageStore = server.getMessageStore();

    // Create the command with explicit IDs
    const command = {
      type: 'ExportSchema',
      data: {
        flowFiles: ['./flows/questionnaires.flow.ts'],
        outputPath: './.context/schema.json',
      },
      requestId: 'export-schema-test-123',
      correlationId: 'corr-export-schema-test-123',
    } as const;

    // Store the command first (like HTTP endpoint does), then send it
    await server.getEventProcessor().storeCommand(command);
    await server.getMessageBus().sendCommand(command);

    // Wait for processing - allow more time for MockFailCommand to execute
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get all messages to debug
    const allMessages = await messageStore.getAllMessages();
    console.log(
      '📋 ALL MESSAGES:',
      allMessages.map((m) => ({
        type: m.messageType,
        messageType: m.message.type,
        requestId: m.message.requestId,
        hasError:
          m.messageType === 'event' &&
          m.message.data != null &&
          typeof m.message.data === 'object' &&
          'error' in m.message.data,
      })),
    );

    // Find commands specifically
    const commands = allMessages.filter((m) => m.messageType === 'command');
    const events = allMessages.filter((m) => m.messageType === 'event');
    console.log(
      '📋 COMMANDS:',
      commands.map((m) => ({ type: m.message.type, requestId: m.message.requestId })),
    );
    console.log(
      '📋 EVENTS:',
      events.map((m) => ({ type: m.message.type, requestId: m.message.requestId })),
    );

    // Generate pipeline graph with message store
    const graph = await getPipelineGraph({ metadataService, messageStore });

    console.log('🔍 PIPELINE GRAPH WITH FAILED COMMAND:');
    console.log(
      'Nodes:',
      graph.nodes.map((n) => ({ name: n.name, status: n.status })),
    );

    // Find the MockFailCommand node
    const mockFailNode = graph.nodes.find((n) => n.name === 'MockFailCommand');
    expect(mockFailNode, 'MockFailCommand node should exist').toBeDefined();

    console.log('🚨 ISSUE DEMONSTRATION:');

    // Find the ExportSchema node which actually failed
    const exportSchemaNode = graph.nodes.find((n) => n.name === 'ExportSchema');
    expect(exportSchemaNode, 'ExportSchema node should exist').toBeDefined();

    console.log(`ExportSchema node status: ${exportSchemaNode?.status}`);
    console.log('Expected: fail (because SchemaExportFailed event has error data)');
    console.log('Actual: This demonstrates the bug - command that emitted error event shows wrong status');

    // The root issue: events have requestId: undefined, breaking status calculation
    const schemaExportFailedEvent = allMessages.find((m) => m.message.type === 'SchemaExportFailed');
    console.log(`SchemaExportFailed event requestId: ${schemaExportFailedEvent?.message.requestId}`);

    // First verify that the event has error data
    expect(schemaExportFailedEvent, 'SchemaExportFailed event should exist').toBeDefined();

    // Check if the event data has error field
    const eventData = schemaExportFailedEvent?.message.data;
    const hasErrorField = eventData != null && typeof eventData === 'object' && 'error' in eventData;
    expect(hasErrorField).toBe(true);

    // The bug: requestId is undefined, so status calculation fails
    expect(schemaExportFailedEvent?.message.requestId).not.toBeUndefined();

    // Once requestId is fixed, the status should be 'fail'
    expect(exportSchemaNode?.status).toBe('fail');
  });
});
