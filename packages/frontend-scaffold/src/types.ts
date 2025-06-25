export interface Flow {
  id: string;
  name: string;
  steps: any[]; // You might want to define a more specific type for steps
  // Add other flow properties as needed
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
  // Add other output properties as needed
} 