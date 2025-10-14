import { Slice } from '@auto-engineer/narrative';

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

function extractProjectionField<K extends keyof ProjectionOrigin>(slice: Slice, fieldName: K): string | undefined {
  if (!('server' in slice)) return undefined;
  const dataSource = slice.server?.data?.[0];
  if (!hasOrigin(dataSource)) return undefined;

  const origin = dataSource.origin;
  if (isProjectionOrigin(origin)) {
    const value = origin[fieldName];
    if (typeof value === 'string') {
      return value;
    }
  }

  return undefined;
}

export function extractProjectionIdField(slice: Slice): string | undefined {
  return extractProjectionField(slice, 'idField');
}

export function extractProjectionName(slice: Slice): string | undefined {
  return extractProjectionField(slice, 'name');
}
