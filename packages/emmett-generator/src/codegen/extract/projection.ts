import {Slice} from "@auto-engineer/flowlang";

interface ProjectionOrigin {
    type: 'projection';
    idField?: string;
    name?: string;
}

interface HasOrigin {
    origin: unknown;
}



function hasOrigin(dataSource: unknown): dataSource is HasOrigin {
    return typeof dataSource === 'object' && dataSource !== null && 'origin' in dataSource;
}


function isProjectionOrigin(origin: unknown): origin is ProjectionOrigin {
    if (typeof origin !== 'object' || origin === null) {
        return false;
    }

    const obj = origin as Record<string, unknown>;
    return obj.type === 'projection';
}

export function extractProjectionIdField(slice: Slice): string | undefined {
    const dataSource = slice.server?.data?.[0];
    if (!hasOrigin(dataSource)) return undefined;

    const origin = dataSource.origin;
    if (isProjectionOrigin(origin)) {
        const idField = origin.idField;
        if (typeof idField === 'string') {
            return idField;
        }
    }

    return undefined;
}

export function extractProjectionName(slice: Slice): string | undefined {
    const dataSource = slice.server?.data?.[0];
    if (!hasOrigin(dataSource)) return undefined;

    const origin = dataSource.origin;
    if (isProjectionOrigin(origin)) {
        const name = origin.name;
        if (typeof name === 'string') {
            return name;
        }
    }

    return undefined;
}