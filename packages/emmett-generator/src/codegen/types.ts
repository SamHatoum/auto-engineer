export interface Flow {
    name: string;
    slices: Slice[];
}

export interface Slice {
    type: 'command' | 'query' | 'react';
    name: string;
    stream?: string;
    client?: any;
    server?: {
        specs: Array<{
            when: { type: string; data: Record<string, any> };
            then: Array<{ type: string; data: Record<string, any> }>;
        }>;
    };
}