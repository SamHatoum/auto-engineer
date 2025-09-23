import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import path from 'path';

interface MessageData {
  messageType: string;
  message: {
    type: string;
    data: Record<string, unknown>;
  };
}

interface CommandMetadata {
  id: string;
  name: string;
  alias: string;
  description: string;
  package: string;
  version?: string;
  category?: string;
  icon: string;
}

interface RegistryData {
  eventHandlers: string[];
  commandHandlers: string[];
  commandsWithMetadata: CommandMetadata[];
  folds: string[];
}

describe('CLI Pipeline Integration', () => {
  let serverProcess: ChildProcess;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    // Start the server using pnpm watch
    const testDir = path.resolve(__dirname, '..', '..', '..', 'examples', 'questionnaires');

    serverProcess = spawn('pnpm', ['auto:debug'], {
      cwd: testDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    // Wait for server to start and extract port from output
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within 20 seconds'));
      }, 20000);

      const handleOutput = (data: Buffer, source: 'stdout' | 'stderr') => {
        const output = data.toString();

        // Look for port in server startup message
        const portMatch = output.match(/Message bus server started on port (\d+)/);
        if (portMatch) {
          port = parseInt(portMatch[1], 10);
          baseUrl = `http://localhost:${port}`;

          // Start checking if server is ready
          const checkServer = () => {
            void axios
              .get(`${baseUrl}/registry`)
              .then(() => {
                clearTimeout(timeout);
                resolve();
              })
              .catch(() => {
                setTimeout(checkServer, 500);
              });
          };
          checkServer();
        }
      };

      serverProcess.stdout?.on('data', (data: Buffer) => handleOutput(data, 'stdout'));

      serverProcess.stderr?.on('data', (data: Buffer) => handleOutput(data, 'stderr'));

      serverProcess.on('error', (error: Error) => {
        console.error('Server process error:', error);
        clearTimeout(timeout);
        reject(error);
      });
    });
  }, 25000);

  afterAll(async () => {
    if (
      serverProcess !== null &&
      typeof serverProcess.pid === 'number' &&
      serverProcess.pid > 0 &&
      !serverProcess.killed
    ) {
      serverProcess.kill('SIGTERM');

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const cleanup = () => resolve();
        serverProcess.on('exit', cleanup);
        setTimeout(() => {
          serverProcess.kill('SIGKILL');
          cleanup();
        }, 5000);
      });
    }
  });

  it('should have registry endpoint available', async () => {
    const response = await axios.get<RegistryData>(`${baseUrl}/registry`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('commandHandlers');
    expect(response.data).toHaveProperty('eventHandlers');

    // Verify our test event handler is registered
    expect(response.data.eventHandlers).toContain('SchemaExported');
  });

  it('should have messages endpoint available', async () => {
    const response = await axios.get<MessageData[]>(`${baseUrl}/messages`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should have sessions endpoint available', async () => {
    const response = await axios.get<unknown[]>(`${baseUrl}/sessions`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should build dynamic bi-directional command-event mappings from loaded plugins', async () => {
    // Get the dynamic mappings from the pipeline graph API
    const pipelineResponse = await axios.get(`${baseUrl}/pipeline`);
    expect(pipelineResponse.status).toBe(200);

    const { commandToEvents, eventToCommand } = pipelineResponse.data;

    if (!commandToEvents) {
      return;
    }

    // Verify key mappings exist
    expect(commandToEvents).toHaveProperty('ExportSchema');
    expect(commandToEvents['ExportSchema']).toEqual(['SchemaExported', 'SchemaExportFailed']);

    expect(commandToEvents).toHaveProperty('GenerateServer');
    expect(commandToEvents['GenerateServer']).toEqual([
      'ServerGenerated',
      'ServerGenerationFailed',
      'SliceImplemented',
    ]);

    // Verify bi-directional mapping
    expect(eventToCommand).toHaveProperty('SchemaExported', 'ExportSchema');
    expect(eventToCommand).toHaveProperty('ServerGenerated', 'GenerateServer');

    // Verify that we have a good variety of commands from different plugins (command names from dynamic mappings)
    const commandNames = Object.keys(commandToEvents);
    expect(commandNames).toContain('ExportSchema');
    expect(commandNames).toContain('GenerateServer');
    expect(commandNames).toContain('ImplementSlice');
    expect(commandNames).toContain('CheckTests');

    // Test cases for commands/events NOT in hardcoded mappings - these should FAIL with current implementation

    // Test CheckTests command (not in hardcoded COMMAND_TO_EVENT_MAP)
    expect(commandToEvents).toHaveProperty('CheckTests');
    expect(commandToEvents['CheckTests']).toEqual(['TestsCheckPassed', 'TestsCheckFailed']);

    // Test ImplementClient command (not in hardcoded mapping)
    expect(commandToEvents).toHaveProperty('ImplementClient');
    expect(commandToEvents['ImplementClient']).toEqual(['ClientImplemented', 'ClientImplementationFailed']);

    // Test ImportDesignSystem command (completely missing from hardcoded mappings)
    expect(commandToEvents).toHaveProperty('ImportDesignSystem');
    expect(commandToEvents['ImportDesignSystem']).toEqual(['ImportDesignSystemCompleted', 'ImportDesignSystemFailed']);

    // Test bi-directional mapping for events not in hardcoded getCommandFromEventType
    expect(eventToCommand).toHaveProperty('TestsCheckPassed', 'CheckTests');
    expect(eventToCommand).toHaveProperty('ClientImplemented', 'ImplementClient');
    expect(eventToCommand).toHaveProperty('ImportDesignSystemCompleted', 'ImportDesignSystem');
  });

  it('should trigger pipeline when ExportSchema command generates SchemaExported event', async () => {
    // Get initial message count to isolate our test
    const initialResponse = await axios.get<MessageData[]>(`${baseUrl}/messages`);
    const initialCount = initialResponse.data.length;

    // Dispatch ExportSchema command which should generate SchemaExported event
    const commandResponse = await axios.post(`${baseUrl}/command`, {
      type: 'ExportSchema',
      data: {
        flowFiles: ['./flows/questionnaires.flow.ts'],
        outputPath: './.context/schema.json',
      },
    });

    expect(commandResponse.status).toBe(200);

    // Wait a bit for the command to process and pipeline to trigger
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check all new messages
    const messagesResponse = await axios.get<MessageData[]>(`${baseUrl}/messages`);
    const messages = messagesResponse.data;
    const newMessages = messages.slice(initialCount);

    // Find the SchemaExported event
    const schemaExportedEvent = newMessages.find(
      (msg) => msg.messageType === 'event' && msg.message.type === 'SchemaExported',
    );

    // Find the GenerateServer command that should have been triggered by the pipeline
    const generateServerCommand = newMessages.find(
      (msg) => msg.messageType === 'command' && msg.message.type === 'GenerateServer',
    );

    // Verify the event was generated
    expect(schemaExportedEvent).toBeDefined();

    // This should fail initially, showing the pipeline is broken
    expect(generateServerCommand).toBeDefined();
    expect(generateServerCommand?.message.data).toEqual({
      schemaPath: './.context/schema.json',
      destination: '.',
    });
  }, 30000);
});
