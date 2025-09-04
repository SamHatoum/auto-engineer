import { z } from 'zod';
import { SpecsSchema } from '../../schema';
import { Flow } from '../../index';

export function assembleSpecs(
  flows: Flow[],
  messages: unknown[],
  integrations: unknown[],
): z.infer<typeof SpecsSchema> {
  return {
    variant: 'specs' as const,
    flows,
    messages: messages as z.infer<typeof SpecsSchema>['messages'],
    integrations: integrations as z.infer<typeof SpecsSchema>['integrations'],
  };
}
