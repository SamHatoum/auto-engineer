import { Slice, CommandExample, EventExample, StateExample, Example } from '@auto-engineer/narrative';
import { GwtCondition } from '../types';

export function buildCommandGwtMapping(slice: Slice): Record<string, (GwtCondition & { failingFields?: string[] })[]> {
  if (slice.type !== 'command') {
    return {};
  }

  const gwtSpecs = extractGwtSpecs(slice);
  const mapping = buildCommandMapping(gwtSpecs);
  return enhanceMapping(mapping);
}

function extractGwtSpecs(slice: Slice) {
  if (!('server' in slice)) return [];
  const specs = slice.server?.specs;
  const rules = specs?.rules;
  return Array.isArray(rules) && rules.length > 0
    ? rules.flatMap((rule) =>
        rule.examples.map((example: Example) => ({
          given: example.given,
          when: example.when,
          then: example.then,
          description: example.description,
          ruleDescription: rule.description,
        })),
      )
    : [];
}

function buildCommandMapping(
  gwtSpecs: Array<{ given: unknown; when: unknown; then: unknown; description?: string; ruleDescription?: string }>,
) {
  const mapping: Record<string, GwtCondition[]> = {};

  for (const gwt of gwtSpecs) {
    let command: string | undefined;
    if (Array.isArray(gwt.when)) {
      continue;
    } else {
      const whenCmd = gwt.when as { commandRef?: string } | undefined;
      command = whenCmd?.commandRef;
    }
    if (typeof command === 'string' && command.length > 0) {
      mapping[command] = mapping[command] ?? [];
      mapping[command].push({
        given: gwt.given as Array<EventExample | StateExample> | undefined,
        when: gwt.when as CommandExample | EventExample[],
        then: gwt.then as Array<EventExample | StateExample | CommandExample | { errorType: string; message?: string }>,
        description: gwt.description,
        ruleDescription: gwt.ruleDescription,
      });
    }
  }

  return mapping;
}

function enhanceMapping(mapping: Record<string, GwtCondition[]>) {
  const enhancedMapping: Record<string, (GwtCondition & { failingFields?: string[] })[]> = {};

  for (const command in mapping) {
    const conditions = mapping[command];
    const successfulData = findSuccessfulExampleData(conditions);

    enhancedMapping[command] = conditions.map((gwt) => ({
      ...gwt,
      failingFields: findFailingFields(gwt, successfulData),
    }));
  }

  return enhancedMapping;
}

function findSuccessfulExampleData(gwts: GwtCondition[]): Record<string, unknown> {
  const successful = gwts.find((gwt) => gwt.then.some((t) => typeof t === 'object' && t !== null && 'eventRef' in t));
  const whenData = Array.isArray(successful?.when) ? successful?.when[0]?.exampleData : successful?.when?.exampleData;
  return typeof whenData === 'object' && whenData !== null ? whenData : {};
}

function findFailingFields(gwt: GwtCondition, successfulData: Record<string, unknown>): string[] {
  const hasError = gwt.then.some((t) => typeof t === 'object' && t !== null && 'errorType' in t);

  if (!hasError) return [];

  const whenData = Array.isArray(gwt.when) ? gwt.when[0]?.exampleData : gwt.when?.exampleData;
  if (typeof whenData !== 'object' || whenData === null) return [];

  return Object.entries(whenData)
    .filter(([key, val]) => {
      const successVal = successfulData[key];
      return val === '' && successVal !== '' && successVal !== undefined;
    })
    .map(([key]) => key);
}
