import { EventExample, Slice } from '@auto-engineer/flow';

interface QueryGwtCondition {
  given: EventExample[];
  then: Array<{ stateRef: string; exampleData: Record<string, unknown> }>;
}

export function buildQueryGwtMapping(slice: Slice): QueryGwtCondition[] {
  if (slice.type !== 'query') {
    return [];
  }

  const specs = slice.server?.specs;
  const rules = specs?.rules;
  const gwtSpecs =
    Array.isArray(rules) && rules.length > 0
      ? rules.flatMap((rule) =>
          rule.examples.map((example) => ({
            given: Array.isArray(example.when) ? example.when : [], // For query slices, when contains the given events
            then: example.then,
          })),
        )
      : [];

  return gwtSpecs.map((gwt) => ({
    given: gwt.given.filter((item): item is EventExample => 'eventRef' in item),
    then: gwt.then.filter(
      (item): item is { stateRef: string; exampleData: Record<string, unknown> } => 'stateRef' in item,
    ),
  }));
}
