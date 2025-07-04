import { generateTextWithAI, AIProvider } from '@auto-engineer/ai-integration';
import { Flow, UXSchema, AIAgentOutput } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

function extractJsonFromMarkdown(text: string): string {
  return text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim();
}

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export class AIAgent {
  private provider: AIProvider;

  constructor(provider: AIProvider = 'anthropic') {
    this.provider = provider;
  }

  async generateUXComponents(flows: string[], uxSchema: UXSchema): Promise<AIAgentOutput> {
    const prompt = this.constructPrompt(flows, uxSchema);
    try {
      const response = await generateTextWithAI(
        prompt,
        this.provider,
        { temperature: 0.7, maxTokens: 4096 }
      );
      if (!response) {
        throw new Error('No response from AI agent');
      }
      const clean = extractJsonFromMarkdown(response);
      if (!isJsonString(clean)) {
        throw new Error('AI did not return valid JSON. Got: ' + clean.slice(0, 100));
      }
      return JSON.parse(clean) as AIAgentOutput;
    } catch (error) {
      console.error('Error calling AI integration:', error);
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

Respond ONLY with a JSON object, no explanation, no markdown, no text before or after.
Return the response as a JSON object with:
1. generatedComponents: Array of component definitions
2. layout: Layout configuration for the components
`;
  }
} 