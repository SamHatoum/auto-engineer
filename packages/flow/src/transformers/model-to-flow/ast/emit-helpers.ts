import tsNS from 'typescript';

/**
 * Type information for converting JSON values with proper Date handling
 */
export interface FieldTypeInfo {
  [fieldName: string]: string; // field name -> type (e.g., 'Date', 'string', etc.)
}

/**
 * Check if a string is a valid ISO date string
 */
function isISODateString(str: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/;
  return isoDateRegex.test(str);
}

/**
 * Emit a TS expression from a plain JSON-like value with optional type information for Date handling.
 */
export function jsonToExpr(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  v: unknown,
  typeInfo?: FieldTypeInfo,
): tsNS.Expression {
  if (v === null) return f.createNull();
  switch (typeof v) {
    case 'string':
      return f.createStringLiteral(v);
    case 'number':
      return f.createNumericLiteral(String(v));
    case 'boolean':
      return v ? f.createTrue() : f.createFalse();
    case 'object': {
      if (v instanceof Date) {
        // Generate new Date('...') for Date objects
        return f.createNewExpression(f.createIdentifier('Date'), undefined, [f.createStringLiteral(v.toISOString())]);
      }
      if (Array.isArray(v)) {
        return f.createArrayLiteralExpression(v.map((x) => jsonToExpr(ts, f, x, typeInfo)));
      }
      const entries = Object.entries(v as Record<string, unknown>);
      return f.createObjectLiteralExpression(
        entries.map(([k, x]) => {
          // Check if this field should be a Date
          const fieldType = typeInfo?.[k];
          let valueExpr: tsNS.Expression;

          if (fieldType === 'Date' && typeof x === 'string' && isISODateString(x)) {
            // Generate new Date('...') for Date fields
            valueExpr = f.createNewExpression(f.createIdentifier('Date'), undefined, [f.createStringLiteral(x)]);
          } else if (fieldType === 'Date' && x instanceof Date) {
            // Generate new Date('...') for Date objects
            valueExpr = f.createNewExpression(f.createIdentifier('Date'), undefined, [
              f.createStringLiteral(x.toISOString()),
            ]);
          } else {
            valueExpr = jsonToExpr(ts, f, x, typeInfo);
          }

          return f.createPropertyAssignment(
            // use identifier if safe, else quoted string
            /^[A-Za-z_]\w*$/.test(k) ? f.createIdentifier(k) : f.createStringLiteral(k),
            valueExpr,
          );
        }),
        false,
      );
    }
    default:
      return f.createIdentifier('undefined');
  }
}

/**
 * Creates primitive type nodes
 */
function createPrimitiveTypeNode(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  trimmed: string,
): tsNS.TypeNode | null {
  switch (trimmed) {
    case 'string':
      return f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case 'number':
      return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'boolean':
      return f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    case 'unknown':
      return f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    case 'Date':
      return f.createTypeReferenceNode('Date');
    default:
      return null;
  }
}

/**
 * Creates array type node if the type is Array<...>
 */
function createArrayTypeNode(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  trimmed: string,
): tsNS.TypeNode | null {
  const arrayMatch = /^Array<(.+)>$/.exec(trimmed);
  if (arrayMatch) {
    const inner = typeFromString(ts, f, arrayMatch[1]);
    return f.createArrayTypeNode(inner);
  }
  return null;
}

/**
 * Creates object literal type node for {prop: type, ...} syntax
 */
function createObjectLiteralTypeNode(
  ts: typeof import('typescript'),
  f: tsNS.NodeFactory,
  trimmed: string,
): tsNS.TypeNode | null {
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  const inner = trimmed.slice(1, -1).trim();
  const members: tsNS.TypeElement[] = [];

  if (inner.length > 0) {
    const parts = splitTopLevel(inner, ',');
    for (const p of parts) {
      const [rawName, ...rest] = p.split(':');
      const name = rawName.trim();
      const rhs = rest.join(':').trim();
      if (name.length === 0 || rhs.length === 0) continue;

      const typeNode = typeFromString(ts, f, rhs);
      members.push(
        f.createPropertySignature(
          undefined,
          /^[A-Za-z_]\w*$/.test(name) ? f.createIdentifier(name) : f.createStringLiteral(name),
          undefined,
          typeNode,
        ),
      );
    }
  }

  return f.createTypeLiteralNode(members);
}

/**
 * Create a TypeNode from a simple textual form (as produced by your schema).
 * Supports: string, number, boolean, unknown, Date, Array<...>, inline object {a: string, ...}
 * Falls back to a named type reference.
 */
export function typeFromString(ts: typeof import('typescript'), f: tsNS.NodeFactory, t: string): tsNS.TypeNode {
  const trimmed = t.trim();

  // Try primitive types
  const primitive = createPrimitiveTypeNode(ts, f, trimmed);
  if (primitive) return primitive;

  // Try array types
  const arrayType = createArrayTypeNode(ts, f, trimmed);
  if (arrayType) return arrayType;

  // Try object literal types
  const objectType = createObjectLiteralTypeNode(ts, f, trimmed);
  if (objectType) return objectType;

  // Fallback: bare identifier type
  return f.createTypeReferenceNode(trimmed);
}

/** Split a string by a delimiter at top-level only (not inside {}, <>). */
function splitTopLevel(input: string, delim: ',' | '|'): string[] {
  const out: string[] = [];
  let depthBrace = 0;
  let depthAngle = 0;
  let cur = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace--;
    else if (ch === '<') depthAngle++;
    else if (ch === '>') depthAngle--;
    if (ch === delim && depthBrace === 0 && depthAngle === 0) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
