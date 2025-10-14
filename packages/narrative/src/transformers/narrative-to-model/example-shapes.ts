import { Message } from '../../index';

export type ExampleShapeHints = Map<
  string, // message name, e.g. "Products"
  Map<string, string> // field -> structural type string, e.g. "products" -> "Array<{ ... }>"
>;

function primitiveOf(v: unknown): string {
  if (v === null) return 'null';
  if (v instanceof Date) return 'Date';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  return 'unknown';
}

function typeFromExample(v: unknown): string {
  if (Array.isArray(v)) {
    const inner = v.length ? typeFromExample(v[0]) : 'unknown';
    return `Array<${inner}>`;
  }
  if (v !== null && v !== undefined && typeof v === 'object' && !(v instanceof Date)) {
    const entries = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${typeFromExample(val)}`)
      .join('; ');
    return `{ ${entries} }`;
  }
  return primitiveOf(v);
}

function isStructural(s: string): boolean {
  const t = s.trim();
  return t.startsWith('{') || t.startsWith('Array<{');
}

function shouldApplyExampleShape(currentType: string, exampleType: string): boolean {
  // Don't override union types (like "string | null") with single types (like "null")
  if (currentType.includes(' | ') && !exampleType.includes(' | ')) {
    return false;
  }
  // Prefer structural example over alias-like/non-structural current type
  return !isStructural(currentType) && isStructural(exampleType);
}

export function collectExampleHintsForData(msgName: string, exampleData: unknown, hints: ExampleShapeHints) {
  if (exampleData === null || exampleData === undefined || typeof exampleData !== 'object') return;
  const byField = hints.get(msgName) ?? new Map<string, string>();
  for (const [k, v] of Object.entries(exampleData as Record<string, unknown>)) {
    const inferred = typeFromExample(v);
    const existing = byField.get(k);
    if (existing === undefined || shouldApplyExampleShape(existing, inferred)) {
      byField.set(k, inferred);
    }
  }
  hints.set(msgName, byField);
}

export function applyExampleShapeHints(msgs: Map<string, Message>, hints: ExampleShapeHints) {
  for (const [msgName, fieldsByName] of hints) {
    const msg = msgs.get(msgName);
    if (!msg || !Array.isArray(msg.fields)) continue;
    msg.fields = msg.fields.map((f) => {
      const hint = fieldsByName.get(f.name);
      return hint !== undefined && shouldApplyExampleShape(f.type, hint) ? { ...f, type: hint } : f;
    });
  }
}
