import { EventExample, Slice } from '@auto-engineer/flowlang';

interface QueryGwtCondition {
  given: EventExample[];
  then: Array<{ stateRef: string; exampleData: Record<string, unknown> }>;
}

export function buildQueryGwtMapping(slice: Slice): QueryGwtCondition[] {
  if (slice.type !== 'query') {
    return [];
  }

  const gwtSpecs = slice.server?.gwt ?? [];
  return gwtSpecs.map((gwt) => ({
    given: gwt.given,
    then: gwt.then,
  }));
}
