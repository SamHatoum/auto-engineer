export interface Flow {
  id: string;
  name: string;
  steps: unknown[];
}

export interface UXSchema {
  $schema: string;
  title: string;
  description: string;
  type: string;
  properties: {
    [key: string]: unknown;
  };
  required?: string[];
}

export interface AIAgentOutput {
  generatedComponents: unknown[];
  layout: unknown;
}
