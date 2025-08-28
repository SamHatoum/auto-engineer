import { generateTextWithAI, AIProvider } from '@auto-engineer/ai-gateway';
import { type UXSchema, type AIAgentOutput } from './types';

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

export class InformationArchitectAgent {
  private provider: AIProvider;

  constructor(provider: AIProvider = AIProvider.Anthropic) {
    this.provider = provider;
  }

  async generateUXComponents(
    flows: string[],
    uxSchema: UXSchema,
    existingSchema?: object,
    atoms?: { name: string; props: { name: string; type: string }[] }[],
  ): Promise<AIAgentOutput> {
    const prompt = this.constructPrompt(flows, uxSchema, existingSchema, atoms);
    try {
      const response = await generateTextWithAI(prompt, this.provider, { temperature: 0.7, maxTokens: 4096 });
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

  private constructPrompt(
    flows: string[],
    uxSchema: UXSchema,
    existingSchema?: object,
    atoms?: { name: string; props: { name: string; type: string }[] }[],
  ): string {
    return `
You are an expert UI architect and product designer. Given the following flows and UX schema, generate a detailed JSON specification for the application's UI components and pages.

IMPORTANT: Only generate pages and components that are directly referenced in the provided flows. Do NOT add any extra pages or components, and do NOT make assumptions outside the flows. If something is not mentioned in the flows, it should NOT appear in the output.
IMPORTANT: try your best to reuse the existing atoms, and try not to generate atoms with context: like Submit Button, because the submit part is mainly irrelevant, instead just use the Button atom if provided.

$${atoms ? `Here is a list of available atomic components (atoms) from the design system. Use these atoms and their props as much as possible. Only create new atoms if absolutely necessary. And only put the new atoms created into the schema. \n\nAtoms:\n${JSON.stringify(atoms, null, 2)}\n` : ''}
Flows:
${JSON.stringify(flows, null, 2)}

UX Schema:
${JSON.stringify(uxSchema, null, 2)}

${existingSchema ? `Here is the current IA schema. Only add, update, or remove what is necessary based on the new flows and UX schema. Preserve what is still relevant and do not make unnecessary changes.\n\nCurrent IA Schema:\n${JSON.stringify(existingSchema, null, 2)}\n` : ''}
Instructions:

- Respond ONLY with a JSON object, no explanation, no markdown, no text before or after.
- The JSON should have two main sections: "components" and "pages".
- In "components", define composite UI elements (atoms, molecules, organisms) with:
    - A description
    - A "composition" field listing the building blocks used, grouped by type:
        - "atoms": for atomic UI primitives (e.g., Button, Text, InputField)
        - "molecules": for reusable, mid-level components (composed of atoms)
        - "organisms": for larger, smart UI components (composed of molecules)
    - Example:
      "composition": {
        "atoms": ["Button", "Text"],
        "molecules": ["SearchBar"],
        "organisms": ["TopNavBar"]
      }
- In "pages", define each page as a key, with:
    - route (URL path)
    - description
    - layout (listing the organisms used)
    - navigation (array of navigation actions, e.g., { "on": "Click Listing Card", "to": "ListingDetailPage" })
    - data_requirements (array, as above, for page-level data fetching)
- For each component or page, if there are any specs defined in the flows using specs('ComponentOrPageName', ...), extract all should(...) statements from .client(() => { ... }) blocks and assign them as an array of strings to a 'specs' field for the corrosponding component/page.
- Only include specs from .client(() => { ... }) blocks, not from server() or other blocks.
- If no specs are found for a component/page, omit the 'specs' field.

Use the following structure as a template for your response:
----
{
  "atoms": {
    "items": {
       "AtomName": {
          ....
       }
     }
  },
  "molecules": {
    "items": {
      "ComponentName": {
        "description": "What this component does.",
        "composition": { "primitives": ["Primitive1", "Primitive2"] },
        "data_requirements": [
          {
            "type": "query",
            "description": "What data is fetched.",
            "trigger": "When the query runs.",
            "details": {
              "source": "Where the data comes from.",
              "gql": "GraphQL query or subscription"
            }
          }
        ]
      }
    }
    // ... more components
  },
  "pages": {
    "PageName": {
      "route": "/route",
      "description": "What this page does.",
      "layout": { "organisms": ["Organism1", "Organism2"] },
      "navigation": [{ "on": "Event", "to": "TargetPage" }],
      "data_requirements": [
        // ... as above
      ]
    }
    // ... more pages
  }
}
----

Be concise but thorough. Use the flows and UX schema to infer the necessary components, their composition, and data requirements.
Do not include any text, explanation, or markdown—only the JSON object as described.
`;
  }
}

export async function processFlowsWithAI(
  flows: string[],
  uxSchema: UXSchema,
  existingSchema?: object,
  atoms?: { name: string; props: { name: string; type: string }[] }[],
): Promise<AIAgentOutput> {
  const agent = new InformationArchitectAgent();
  return agent.generateUXComponents(flows, uxSchema, existingSchema, atoms);
}

export * from './commands/generate-ia';
export { CLI_MANIFEST } from './cli-manifest';
