// Barrel exports
export { InformationArchitectAgent, processFlowsWithAI } from './ia-agent.js';
export type { UXSchema, AIAgentOutput } from './types.js';

import { commandHandler as generateIAHandler } from './commands/generate-ia';
export const COMMANDS = [generateIAHandler];
export type {
  GenerateIACommand,
  GenerateIAEvents,
  IAGeneratedEvent,
  IAGenerationFailedEvent,
} from './commands/generate-ia';
