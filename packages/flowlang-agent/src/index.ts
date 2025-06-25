import { generateTextWithAI, streamTextWithAI, type AIProvider, type AIOptions, loadConfig, validateConfig } from '@auto-engineer/ai-integration';
import 'dotenv/config';

// Load and validate config once
const config = loadConfig();
validateConfig(config);

// Re-export the main functions from ai-integration
export { generateTextWithAI as generateText, streamTextWithAI as streamText } from '@auto-engineer/ai-integration';

// Main function that takes prompt from console and sends to a specific provider
export async function main() {
  const prompt = "what's the weather in sf in the summer? be very concise";
  console.log(`Sending prompt: "${prompt}"`);
  
  const provider = 'xai' as AIProvider; // 'openai', 'anthropic', 'google', 'xai'
  console.log(`Using provider: ${provider}\n`);

  const options: AIOptions = {
    model: undefined, // undefined to use default model for provider
    temperature: 0.7,
    maxTokens: 1000,
  };

  try {
    // Example 1: Regular generation
    console.log('=== Regular Generation ===');
    const result = await generateTextWithAI(prompt, provider, options);
    console.log('Response:');
    console.log('='.repeat(50));
    console.log(result);
    console.log('\n');

    // Example 2: Streaming generation
    console.log('=== Streaming Generation ===');
    console.log('Response:');
    console.log('='.repeat(50));
    
    const stream = streamTextWithAI(prompt, provider);
    for await (const token of stream) {
      process.stdout.write(token);
    }
    console.log('\n');
    console.log('Streaming completed!');
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}