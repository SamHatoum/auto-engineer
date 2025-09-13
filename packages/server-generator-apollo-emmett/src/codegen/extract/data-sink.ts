import { CommandExample, Slice, type Example } from '@auto-engineer/flow';

function resolveStreamId(stream: string, exampleData: Record<string, unknown>): string {
  return stream.replace(/\$\{([^}]+)\}/g, (_, key: string) => String(exampleData?.[key] ?? 'unknown'));
}

function extractExampleDataFromReact(firstSpec: { when: unknown }): Record<string, unknown> {
  if (Array.isArray(firstSpec.when)) {
    const firstWhen = firstSpec.when[0] as { exampleData?: Record<string, unknown> } | undefined;
    return typeof firstWhen?.exampleData === 'object' && firstWhen.exampleData !== null ? firstWhen.exampleData : {};
  }
  return {};
}

function extractExampleDataFromCommand(firstSpec: { then: unknown }): Record<string, unknown> {
  const then = firstSpec.then as (CommandExample | { errorType: string })[];
  const firstExample = then.find((t): t is CommandExample => 'exampleData' in t);
  return typeof firstExample?.exampleData === 'object' && firstExample.exampleData !== null
    ? firstExample.exampleData
    : {};
}

function extractExampleDataFromQuery(firstSpec: { when: unknown }): Record<string, unknown> {
  if (Array.isArray(firstSpec.when)) {
    const firstWhen = firstSpec.when[0] as { exampleData?: Record<string, unknown> } | undefined;
    return typeof firstWhen?.exampleData === 'object' && firstWhen.exampleData !== null ? firstWhen.exampleData : {};
  }
  return {};
}

function extractExampleDataFromSpecs(
  slice: Slice,
  gwtSpecs: Array<{ given?: unknown; when: unknown; then: unknown }>,
): Record<string, unknown> {
  if (gwtSpecs.length === 0) {
    return {};
  }

  const firstSpec = gwtSpecs[0];
  switch (slice.type) {
    case 'react':
      return extractExampleDataFromReact(firstSpec);
    case 'command':
      return extractExampleDataFromCommand(firstSpec);
    case 'query':
      return extractExampleDataFromQuery(firstSpec);
    default:
      return {};
  }
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
        })),
      )
    : [];
}

function isValidStreamSink(item: unknown): item is { destination: { pattern: string } } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'destination' in item &&
    typeof item.destination === 'object' &&
    item.destination !== null &&
    'type' in item.destination &&
    item.destination.type === 'stream' &&
    'pattern' in item.destination &&
    typeof item.destination.pattern === 'string'
  );
}

function processStreamSink(item: unknown, exampleData: Record<string, unknown>) {
  if (!isValidStreamSink(item)) {
    return null;
  }

  const streamPattern = item.destination.pattern;
  const streamId = streamPattern.length > 0 ? resolveStreamId(streamPattern, exampleData) : undefined;

  return { streamPattern, streamId };
}

export function getStreamFromSink(slice: Slice): { streamPattern?: string; streamId?: string } {
  if (!('server' in slice)) return {};
  const gwtSpecs = extractGwtSpecs(slice);
  const exampleData = extractExampleDataFromSpecs(slice, gwtSpecs);
  const serverData = slice.server?.data;

  if (!Array.isArray(serverData)) {
    return {};
  }

  for (const item of serverData) {
    const result = processStreamSink(item, exampleData);
    if (result) {
      return result;
    }
  }

  return {};
}
