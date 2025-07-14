import {CommandExample, DataSink, Slice} from '@auto-engineer/flowlang';
import {CommandGwtSpec, QueryGwtSpec, ReactGwtSpec} from "./messages";

function resolveStreamId(stream: string, exampleData: Record<string, unknown>): string {
    return stream.replace(/\$\{([^}]+)\}/g, (_, key: string) => String(exampleData?.[key] ?? 'unknown'));
}

// eslint-disable-next-line complexity
export function getStreamFromSink(slice: Slice): { streamPattern?: string; streamId?: string } {
    let streamPattern: string | undefined;
    let streamId: string | undefined;
    const gwtSpecs =
        slice.type === 'command'
            ? (slice.server?.gwt as CommandGwtSpec[])
            : slice.type === 'query'
                ? (slice.server?.gwt as QueryGwtSpec[])
                : slice.type === 'react'
                    ? (slice.server?.gwt as ReactGwtSpec[])
                    : [];
    let exampleData: Record<string, unknown> = {};
    switch (slice.type) {
        case 'react':
            exampleData = (gwtSpecs as ReactGwtSpec[])[0].when?.[0]?.exampleData ?? {};
            break;
        case 'command': {
            const then = (gwtSpecs as CommandGwtSpec[])[0]?.then as (CommandExample | { errorType: string })[];
            const firstExample = then.find((t): t is CommandExample => 'exampleData' in t);
            exampleData = firstExample?.exampleData ?? {};
            break;
        }
        case 'query':
            exampleData = (gwtSpecs as QueryGwtSpec[])[0]?.given?.[0]?.exampleData ?? {};
            break;
    }
    const sink = (slice.server?.data ?? []).find(
        (item): item is DataSink & { destination: { type: 'stream'; pattern: string } } =>
            (item as DataSink)?.destination?.type === 'stream'
    );
    if (sink) {
        streamPattern = sink.destination.pattern;
        if (streamPattern != null) {
            streamId = resolveStreamId(streamPattern, exampleData);
        }
    }
    return {streamPattern, streamId};
}