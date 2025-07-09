import {CommandExample, EventExample} from "@auto-engineer/flowlang";

export interface Message {
    type: string;
    fields: Field[];
    source?: 'when' | 'given' | 'then';
    sourceFlowName?: string;
    sourceSliceName?: string;
}

export interface Field {
    name: string;
    tsType: string;
    required: boolean;
}

export interface MessageDefinition {
    type: 'command' | 'event' | 'state';
    name: string;
    fields?: Array<{
        name: string;
        type: string;
        required?: boolean;
        description?: string;
        defaultValue?: unknown;
    }>;
    metadata?: unknown;
    description?: string;
}

export interface GwtCondition {
    given?: EventExample[];
    when: CommandExample;
    then: Array<EventExample | { errorType: string; message?: string }>;
}