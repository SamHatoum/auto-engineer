import { Narrative, Model } from '../../index';

export function assembleSpecs(narratives: Narrative[], messages: unknown[], integrations: unknown[]): Model {
  return {
    variant: 'specs' as const,
    narratives,
    messages: messages as Model['messages'],
    integrations: integrations as Model['integrations'],
  };
}
