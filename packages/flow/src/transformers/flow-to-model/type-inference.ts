import { TypeInfo } from '../../loader/ts-utils';

function tryDataFieldMatch(typeInfo: TypeInfo, dataKeys: Set<string>): boolean {
  const dataField = typeInfo.dataFields?.find((f) => f.name === 'data');
  if (
    dataField &&
    typeof dataField.type === 'string' &&
    dataField.type.startsWith('{') &&
    dataField.type.endsWith('}')
  ) {
    const bodyMatch = dataField.type.match(/^\{\s*([^}]*)\s*\}$/);
    if (bodyMatch && bodyMatch[1]) {
      const body = bodyMatch[1];
      const innerKeys = new Set<string>();
      const re = /(\w+)(\?)?\s*:\s*([^;,]+)(?=[;,]|$)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        innerKeys.add(m[1]);
      }

      return dataKeys.size > 0 && Array.from(dataKeys).every((key) => innerKeys.has(key));
    }
  }
  return false;
}

function tryTopLevelMatch(typeInfo: TypeInfo, dataKeys: Set<string>): boolean {
  if (typeInfo.dataFields && typeInfo.dataFields.length > 0) {
    const typeKeys = new Set(typeInfo.dataFields.map((f) => f.name));
    if (dataKeys.size > 0 && typeKeys.size > 0) {
      return dataKeys.size <= typeKeys.size && Array.from(dataKeys).every((key) => typeKeys.has(key));
    }
  }
  return false;
}

function tryMatchCandidates(candidates: TypeInfo[], dataKeys: Set<string>): string | null {
  for (const typeInfo of candidates) {
    if (typeInfo.dataFields && typeInfo.dataFields.length > 0) {
      if (tryDataFieldMatch(typeInfo, dataKeys) || tryTopLevelMatch(typeInfo, dataKeys)) {
        return typeInfo.stringLiteral;
      }
    }
  }
  return null;
}

function resolveFromCandidates(
  candidates: TypeInfo[],
  all: TypeInfo[],
  expectedMessageType?: 'command' | 'event' | 'state',
  exampleData?: unknown,
): string | null {
  if (candidates.length === 1) return candidates[0].stringLiteral;

  if (exampleData !== null && typeof exampleData === 'object' && exampleData !== undefined) {
    const dataKeys = new Set(Object.keys(exampleData));

    const match = tryMatchCandidates(candidates, dataKeys);
    if (match !== null) return match;

    if (expectedMessageType !== undefined) {
      const fallbackMatch = tryMatchCandidates(all, dataKeys);
      if (fallbackMatch !== null) return fallbackMatch;
    }
  }

  return null;
}

export function resolveInferredType(
  typeName: string,
  flowTypeMap?: Map<string, TypeInfo>,
  expectedMessageType?: 'command' | 'event' | 'state',
  exampleData?: unknown,
): string {
  if (typeName !== 'InferredType' || flowTypeMap === undefined) return typeName;

  const all = [...flowTypeMap.values()];
  if (all.length === 0) return typeName;

  const candidates = expectedMessageType ? all.filter((t) => t.classification === expectedMessageType) : all;

  const resolved = resolveFromCandidates(candidates, all, expectedMessageType, exampleData);
  return resolved ?? typeName;
}
