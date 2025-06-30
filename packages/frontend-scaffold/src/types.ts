export interface Flow {
  id: string;
  name: string;
  steps: any[];
}

export interface UXSchema {
  $schema: string;
  title: string;
  description: string;
  type: string;
  properties: {
    [key: string]: any;
  };
  required?: string[];
}

export interface AIAgentOutput {
  generatedComponents: any[];
  layout: any;
} 