import { Slice } from '@auto-engineer/flowlang';
import { GwtCondition } from '../types';

export function buildCommandGwtMapping(slice: Slice): Record<string, (GwtCondition & { failingFields?: string[] })[]> {
  if (slice.type !== 'command') {
    return {};
  }

  const gwtSpecs = slice.server?.gwt ?? [];
  const mapping: Record<string, GwtCondition[]> = {};

  for (const gwt of gwtSpecs) {
    const command = gwt.when?.commandRef;
    if (command) {
      mapping[command] = mapping[command] ?? [];
      mapping[command].push({
        given: gwt.given,
        when: gwt.when,
        then: gwt.then,
      });
    }
  }

  const enhancedMapping: Record<string, (GwtCondition & { failingFields?: string[] })[]> = {};

  for (const command in mapping) {
    const merged = mergeGwtConditions(mapping[command]);
    const successfulData = findSuccessfulExampleData(merged);

    enhancedMapping[command] = merged.map((gwt) => ({
      ...gwt,
      failingFields: findFailingFields(gwt, successfulData),
    }));
  }

  return enhancedMapping;
}

function mergeGwtConditions(gwts: GwtCondition[]): GwtCondition[] {
  const map = new Map<string, GwtCondition[]>();

  for (const gwt of gwts) {
    const key = JSON.stringify(gwt.when.exampleData);
    const existing = map.get(key) ?? [];
    map.set(key, [...existing, gwt]);
  }

  return Array.from(map.values()).map((conditions) => {
    const first = conditions[0];
    const combinedThen = conditions.flatMap((g) => g.then);
    return {
      given: first.given,
      when: first.when,
      then: combinedThen,
    };
  });
}

function findSuccessfulExampleData(gwts: GwtCondition[]): Record<string, unknown> {
  const successful = gwts.find((gwt) => gwt.then.some((t) => typeof t === 'object' && t !== null && 'eventRef' in t));
  return successful?.when.exampleData ?? {};
}

function findFailingFields(gwt: GwtCondition, successfulData: Record<string, unknown>): string[] {
  const hasError = gwt.then.some((t) => typeof t === 'object' && t !== null && 'errorType' in t);

  if (!hasError) return [];

  return Object.entries(gwt.when.exampleData)
    .filter(([key, val]) => {
      const successVal = successfulData[key];
      return val === '' && successVal !== '' && successVal !== undefined;
    })
    .map(([key]) => key);
}
