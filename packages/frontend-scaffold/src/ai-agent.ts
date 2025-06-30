import OpenAI from 'openai';
import { Flow, UXSchema, AIAgentOutput } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

export class AIAgent {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateUXComponents(flows: string[], uxSchema: UXSchema): Promise<AIAgentOutput> {
    const prompt = this.constructPrompt(flows, uxSchema);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert UI/UX designer and frontend developer. Your task is to analyze flows and generate UI components that follow the provided UX schema. 
            Output should be strictly in JSON format matching the AIAgentOutput type with generatedComponents and layout properties.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI agent');
      }

      return JSON.parse(response) as AIAgentOutput;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  }

  private constructPrompt(flows: string[], uxSchema: UXSchema): string {
    return `
Please analyze these flows and UX schema to generate appropriate UI components:

Flows:
${JSON.stringify(flows, null, 2)}

UX Schema:
${JSON.stringify(uxSchema, null, 2)}

Generate a UI component structure that:
1. Creates components for each flow
2. Organizes them in a logical layout
3. Follows the UX schema guidelines
4. Ensures good user experience and navigation

Return the response as a JSON object with:
1. generatedComponents: Array of component definitions
2. layout: Layout configuration for the components
`;
  }
} 