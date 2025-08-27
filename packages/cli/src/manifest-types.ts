export interface CommandDefinition {
  handler: () => Promise<unknown>;
  description: string;
  usage?: string;
  examples?: string[];
  args?: Array<{ name: string; description: string; required?: boolean }>;
  options?: Array<{ name: string; description: string }>;
}

export interface CliManifest {
  category: string;
  commands: Record<string, CommandDefinition>;
}

export const CLI_MANIFEST = {} as CliManifest; // Type-only export
