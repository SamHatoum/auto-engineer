import { TypeInfo } from '../../loader/ts-utils';
import { Message } from '../../index';

function inlineIdentifier(name: string, lookup: Map<string, TypeInfo>, seen = new Set<string>()): string | undefined {
  // avoid infinite recursion on cyclical type graphs
  if (seen.has(name)) return undefined;
  seen.add(name);

  const ti = lookup.get(name);
  if (!ti) return undefined;

  // If the referenced type has object-like fields, inline them as { a: T; b?: U }
  if (Array.isArray(ti.dataFields) && ti.dataFields.length > 0) {
    const parts = ti.dataFields.map((f) => {
      const nested = inlineTypeString(f.type, lookup, seen);
      const typeStr = nested ?? f.type;
      return `${f.name}${f.required ? '' : '?'}: ${typeStr}`;
    });
    return `{ ${parts.join('; ')} }`;
  }

  // If we don't have field info, we can't inline safely
  return undefined;
}

function handleArrayType(type: string, lookup: Map<string, TypeInfo>, seen: Set<string>): string | undefined {
  const arr = type.match(/^Array<\s*([^>]+)\s*>$/);
  if (arr) {
    const inner = arr[1].trim();
    const inlinedInner = inlineTypeString(inner, lookup, seen) ?? inlineIdentifier(inner, lookup, seen);
    if (inlinedInner !== undefined && inlinedInner !== null) return `Array<${inlinedInner}>`;
  }
  return undefined;
}

function isPrimitiveType(type: string): boolean {
  return (
    type === 'string' ||
    type === 'number' ||
    type === 'boolean' ||
    type === 'Date' ||
    type === 'unknown' ||
    type === 'any'
  );
}

function isStructuralType(type: string): boolean {
  const trimmed = type.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || trimmed.includes(' | null') || trimmed.includes('|null');
}

function inlineTypeString(type: string, lookup: Map<string, TypeInfo>, seen = new Set<string>()): string | undefined {
  // Array<T>
  const arrayResult = handleArrayType(type, lookup, seen);
  if (arrayResult !== undefined) return arrayResult;

  // Basic primitives we don't touch
  if (isPrimitiveType(type)) {
    return undefined;
  }

  // Already structural? (starts with '{' and ends with '}' or looks like a union with null)
  if (isStructuralType(type)) {
    return undefined; // keep as is
  }

  // Handle union types like "string | null"
  if (type.includes(' | ')) {
    const parts = type.split(' | ').map((p) => p.trim());
    const inlinedParts = parts.map((part) => {
      if (isPrimitiveType(part) || part === 'null') {
        return part;
      }
      const inlined = inlineTypeString(part, lookup, seen);
      return inlined ?? part;
    });
    // Fix: Convert "unknown" back to "null" in union types (TypeScript parsing issue)
    // Only replace unknown with null when it's part of a union with other types
    const result = inlinedParts.join(' | ');
    if (inlinedParts.length > 1 && inlinedParts.includes('unknown')) {
      return result.replace(/\bunknown\b/g, 'null');
    }
    return result;
  }

  // Single identifier? Try to inline it
  const ident = type.match(/^[A-Za-z_]\w*$/);
  if (ident) {
    const asObj = inlineIdentifier(type, lookup, seen);
    if (asObj !== undefined) return asObj;
    return undefined;
  }

  // Generic we don't specially handle (Record<...>, etc.) -> leave as-is
  return undefined;
}

export function inlineAllMessageFieldTypes(msgs: Map<string, Message>, lookup: Map<string, TypeInfo>): void {
  for (const [, msg] of msgs) {
    if (!Array.isArray(msg.fields)) continue;
    msg.fields = msg.fields.map((f) => {
      const inlined = inlineTypeString(f.type, lookup);
      return inlined !== undefined ? { ...f, type: inlined } : f;
    });
  }
}
