import { EventExample, Slice } from '@auto-engineer/flow';

interface QueryGwtCondition {
  description: string;
  given?: EventExample[];
  when: EventExample[];
  then: Array<{ stateRef: string; exampleData: Record<string, unknown> }>;
}

export function buildQueryGwtMapping(slice: Slice): QueryGwtCondition[] {
  if (slice.type !== 'query') return [];

  const specs = slice.server?.specs;
  const rules = specs?.rules;

  const examples = Array.isArray(rules) && rules.length > 0 ? rules.flatMap((rule) => rule.examples) : [];

  return examples.map((ex) => {
    const givenEvents = Array.isArray(ex.given) ? ex.given.filter((i): i is EventExample => 'eventRef' in i) : [];
    const whenEvents = Array.isArray(ex.when) ? ex.when.filter((i): i is EventExample => 'eventRef' in i) : [];

    return {
      description: ex.description,
      given: givenEvents.length > 0 ? givenEvents : undefined,
      when: whenEvents,
      then: ex.then.filter((i): i is { stateRef: string; exampleData: Record<string, unknown> } => 'stateRef' in i),
    };
  });
}
