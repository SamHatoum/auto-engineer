import { Flow, UXSchema, AIAgentOutput } from './types';
import { AIAgent } from './ai-agent';
import * as fs from 'fs/promises';
import * as path from 'path';
import uxSchema from './auto-ux-schema.json';

export class FrontendScaffoldBuilder {
  private uxSchemaOutput: AIAgentOutput | null = null;
  private aiAgent: AIAgent;

  constructor() {
    this.aiAgent = new AIAgent();
  }

  cloneStarter() {
    console.log('Cloning starter project...');
    return this;
  }

  anotherMethod() {
    console.log('Another builder method called.');
    return this;
  }

  async processFlowsWithAI(flows: string[]): Promise<this> {
    try {
      this.uxSchemaOutput = await this.aiAgent.generateUXComponents(flows, uxSchema);

      console.log('Processed flows with AI agent', JSON.stringify(this.uxSchemaOutput, null, 2));
      console.log('Number of flows processed:', flows.length);
      console.log('UX Schema title:', uxSchema.title);

      return this;
    } catch (error) {
      console.error('Error processing flows:', error);
      throw error;
    }
  }

  getUXSchemaOutput(): AIAgentOutput | null {
    return this.uxSchemaOutput;
  }
}