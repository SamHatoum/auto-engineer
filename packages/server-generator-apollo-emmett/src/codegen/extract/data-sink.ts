import { CommandExample, DataSink, Slice } from '@auto-engineer/flow';

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

function findStreamSink(slice: Slice): DataSink | undefined {
  return (slice.server?.data ?? []).find((item) => (item as DataSink)?.destination?.type === 'stream') as
    | DataSink
    | undefined;
}

export function getStreamFromSink(slice: Slice): { streamPattern?: string; streamId?: string } {
  const specs = slice.server?.specs;
  const rules = specs?.rules;
  const gwtSpecs =
    Array.isArray(rules) && rules.length > 0
      ? rules.flatMap((rule) =>
          rule.examples.map((example) => ({
            given: example.given,
            when: example.when,
            then: example.then,
          })),
        )
      : [];

  const exampleData = extractExampleDataFromSpecs(slice, gwtSpecs);
  const sink = findStreamSink(slice);

  if (sink && sink.destination.type === 'stream' && 'pattern' in sink.destination) {
    const streamPattern = sink.destination.pattern;
    const streamId = streamPattern ? resolveStreamId(streamPattern, exampleData) : undefined;
    return { streamPattern, streamId };
  }

  return {};
}
