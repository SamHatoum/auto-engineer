import { Flow, Model } from '../../index';

export function assembleSpecs(flows: Flow[], messages: unknown[], integrations: unknown[]): Model {
  return {
    variant: 'specs' as const,
    flows,
    messages: messages as Model['messages'],
    integrations: integrations as Model['integrations'],
  };
}
