import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

interface Component {
  type: string;
  items?: Record<string, unknown>;
}

interface Scheme {
  generatedComponents?: Component[];
  atoms?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  molecules?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  organisms?: {
    description?: string;
    items?: Record<string, unknown>;
  };
  pages?: {
    description?: string;
    items?: Record<string, unknown>;
  };
}

// Helper to recursively list files
async function listFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(res, base);
    } else {
      return [path.relative(base, res)];
    }
  }));
  return files.flat();
}

// Helper to read auto-ia-scheme.json
async function readAutoIAScheme(directory: string): Promise<Scheme> {
  const filePath = path.join(directory, "auto-ia-scheme.json");
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as Scheme;
}

function buildEntities(scheme: Scheme) {
  const entities = [];
  if (scheme.atoms) entities.push({ type: 'atoms', items: Object.keys(scheme.atoms.items ?? {}) });
  if (scheme.molecules) entities.push({ type: 'molecules', items: Object.keys(scheme.molecules.items ?? {}) });
  if (scheme.organisms) entities.push({ type: 'organisms', items: Object.keys(scheme.organisms.items ?? {}) });
  if (scheme.pages) entities.push({ type: 'pages', items: Object.keys(scheme.pages.items ?? {}) });
  return entities;
}

const server = new McpServer({
  name: "frontend-implementation",
  version: "0.1.0"
});

// Tool: List all files in the project
server.registerTool(
  "listFiles",
  {
    title: "List Project Files",
    description: "List all files in the given project directory.",
    inputSchema: {
      directory: z.string().min(1, "Directory is required")
    }
  },
  async ({ directory }: { directory: string }) => {
    try {
      const files = await listFiles(directory);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(files, null, 2)
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
);

// Tool: Read a file
server.registerTool(
  "readFile",
  {
    title: "Read File",
    description: "Read the contents of a file in the project.",
    inputSchema: {
      directory: z.string().min(1, "Directory is required"),
      relativePath: z.string().min(1, "Relative file path is required")
    }
  },
  async ({ directory, relativePath }: { directory: string, relativePath: string }) => {
    try {
      const filePath = path.join(directory, relativePath);
      const content = await fs.readFile(filePath, "utf-8");
      return {
        content: [{
          type: "text",
          text: content
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
);

// Tool: Create or update a file
server.registerTool(
  "createOrUpdateFile",
  {
    title: "Create or Update File",
    description: "Create or overwrite a file in the given React project directory.",
    inputSchema: {
      directory: z.string().min(1, "Directory is required"),
      relativePath: z.string().min(1, "Relative file path is required"),
      content: z.string().min(1, "File content is required")
    }
  },
  async ({ directory, relativePath, content }: { directory: string, relativePath: string, content: string }) => {
    try {
      const filePath = path.join(directory, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      return {
        content: [{
          type: "text",
          text: `File created/updated: ${filePath}`
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error creating/updating file: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
);

// Tool: Read auto-ia-scheme.json
server.registerTool(
  "readAutoIAScheme",
  {
    title: "Read auto-ia-scheme.json",
    description: "Read and return the parsed auto-ia-scheme.json from the project root.",
    inputSchema: {
      directory: z.string().min(1, "Directory is required")
    }
  },
  async ({ directory }: { directory: string }) => {
    try {
      const scheme = await readAutoIAScheme(directory);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(scheme, null, 2)
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error reading auto-ia-scheme.json: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
);

// Tool: List entities from auto-ia-scheme.json
server.registerTool(
  "listAutoIASchemeEntities",
  {
    title: "List Entities from auto-ia-scheme.json",
    description: "List all atoms, molecules, organisms, and pages defined in auto-ia-scheme.json.",
    inputSchema: {
      directory: z.string().min(1, "Directory is required")
    }
  },
  async ({ directory }: { directory: string }) => {
    try {
      const scheme = await readAutoIAScheme(directory);
      const entities = buildEntities(scheme);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(entities, null, 2)
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error listing entities: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
);

const transport = new StdioServerTransport();

async function cleanup() {
  console.log("Cleaning up...");
  await transport.close();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void cleanup();
});
process.on("SIGINT", () => {
  void cleanup();
});

async function startServer() {
  await server.connect(transport);
  console.error("Frontend Implementation MCP Server running on stdio");
}

startServer().catch(console.error);
