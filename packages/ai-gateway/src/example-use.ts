import { z } from 'zod';
import { registerTool, registerTools, startServer, isServerStarted, type ToolHandler } from '.';

// Example 1: Simple tool with basic types
interface GreetingParams extends Record<string, unknown> {
  name: string;
  language?: 'en' | 'es' | 'fr' | 'de';
}

registerTool<GreetingParams>(
  'greet',
  {
    title: 'Greeting Tool',
    description: 'Greets users in different languages',
    inputSchema: {
      name: z.string().min(1, 'Name is required'),
      language: z.enum(['en', 'es', 'fr', 'de']).optional().default('en'),
    },
  },
  async ({ name, language = 'en' }) => {
    const greetings = {
      en: `Hello, ${name}!`,
      es: `¡Hola, ${name}!`,
      fr: `Bonjour, ${name}!`,
      de: `Hallo, ${name}!`,
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: greetings[language],
        },
      ],
    };
  },
);

// Example 2: Calculator tool with validation
interface CalculatorParams extends Record<string, unknown> {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

const calculatorHandler: ToolHandler<CalculatorParams> = async ({ operation, a, b }) => {
  try {
    let result: number;

    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: Division by zero',
              },
            ],
            isError: true,
          };
        }
        result = a / b;
        break;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `${a} ${operation} ${b} = ${result}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
};

registerTool<CalculatorParams>(
  'calculator',
  {
    title: 'Calculator',
    description: 'Performs basic arithmetic operations',
    inputSchema: {
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    },
  },
  calculatorHandler,
);

// Example 3: Batch registration of multiple tools
interface DateFormatterParams extends Record<string, unknown> {
  date: string;
  format: 'iso' | 'us' | 'eu';
}

interface TextAnalyzerParams extends Record<string, unknown> {
  text: string;
  analysis: 'wordCount' | 'charCount' | 'sentiment';
}

// Register date formatter tool
registerTool<DateFormatterParams>(
  'dateFormatter',
  {
    title: 'Date Formatter',
    description: 'Formats dates in various styles',
    inputSchema: {
      date: z.string(),
      format: z.enum(['iso', 'us', 'eu']),
    },
  },
  async ({ date, format }) => {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Invalid date format',
          },
        ],
        isError: true,
      };
    }

    const formatters = {
      iso: () => dateObj.toISOString(),
      us: () => dateObj.toLocaleDateString('en-US'),
      eu: () => dateObj.toLocaleDateString('en-GB'),
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: formatters[format](),
        },
      ],
    };
  },
);

// Register text analyzer tool
registerTool<TextAnalyzerParams>(
  'textAnalyzer',
  {
    title: 'Text Analyzer',
    description: 'Analyzes text content',
    inputSchema: {
      text: z.string(),
      analysis: z.enum(['wordCount', 'charCount', 'sentiment']),
    },
  },
  async ({ text, analysis }) => {
    const analyzers = {
      wordCount: () => `Word count: ${text.split(/\s+/).filter((w) => w.length > 0).length}`,
      charCount: () => `Character count: ${text.length}`,
      sentiment: () => {
        // Simple sentiment analysis based on keywords
        const positive = ['happy', 'good', 'great', 'excellent', 'wonderful'].some((word) =>
          text.toLowerCase().includes(word),
        );
        const negative = ['sad', 'bad', 'terrible', 'awful', 'horrible'].some((word) =>
          text.toLowerCase().includes(word),
        );

        if (positive && !negative) return 'Sentiment: Positive 😊';
        if (negative && !positive) return 'Sentiment: Negative 😢';
        if (positive && negative) return 'Sentiment: Mixed 😐';
        return 'Sentiment: Neutral 😐';
      },
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: analyzers[analysis](),
        },
      ],
    };
  },
);

// Example 3b: Using registerTools with same parameter types
interface MathToolParams extends Record<string, unknown> {
  x: number;
  y: number;
}

registerTools<MathToolParams>([
  {
    name: 'add',
    description: {
      title: 'Addition',
      description: 'Adds two numbers',
      inputSchema: {
        x: z.number(),
        y: z.number(),
      },
    },
    handler: async ({ x, y }) => ({
      content: [
        {
          type: 'text' as const,
          text: `${x} + ${y} = ${x + y}`,
        },
      ],
    }),
  },
  {
    name: 'multiply',
    description: {
      title: 'Multiplication',
      description: 'Multiplies two numbers',
      inputSchema: {
        x: z.number(),
        y: z.number(),
      },
    },
    handler: async ({ x, y }) => ({
      content: [
        {
          type: 'text' as const,
          text: `${x} × ${y} = ${x * y}`,
        },
      ],
    }),
  },
]);

// Example 4: Complex tool with nested data
interface FileManagerParams extends Record<string, unknown> {
  action: 'create' | 'read' | 'list';
  path: string;
  content?: string;
  options?: {
    recursive?: boolean;
    encoding?: 'utf8' | 'base64';
  };
}

registerTool<FileManagerParams>(
  'fileManager',
  {
    title: 'File Manager',
    description: 'Manages files and directories',
    inputSchema: {
      action: z.enum(['create', 'read', 'list']),
      path: z.string(),
      content: z.string().optional(),
      options: z
        .object({
          recursive: z.boolean().optional(),
          encoding: z.enum(['utf8', 'base64']).optional(),
        })
        .optional(),
    },
  },
  async ({ action, path, content, options }) => {
    // This is a mock implementation for demonstration
    const mockResponses = {
      create: () => `Created file: ${path}`,
      read: () => `Contents of ${path}: ${content ?? '[empty]'}`,
      list: () => `Files in ${path}: file1.txt, file2.txt${options?.recursive === true ? ', subfolder/' : ''}`,
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: mockResponses[action](),
        },
      ],
    };
  },
);

// Example usage in an application
async function main() {
  // Check if server is already started
  if (!isServerStarted()) {
    console.log('Starting MCP server with registered tools...');

    // You can register more tools here before starting
    registerTool<{ message: string }>(
      'echo',
      {
        title: 'Echo Tool',
        description: 'Echoes back the input message',
        inputSchema: {
          message: z.string(),
        },
      },
      async ({ message }) => ({
        content: [
          {
            type: 'text' as const,
            text: `Echo: ${message}`,
          },
        ],
      }),
    );

    // Start the server (this should only be called once in your application)
    await startServer();
    console.log('Server started successfully!');
  } else {
    console.log('Server is already running');
  }
}

// Export for use in other modules
export { main };

// Demonstrate the singleton pattern
console.log('Example usage loaded. The same server instance will be used across all imports.');
