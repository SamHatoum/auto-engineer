export function isInlineObject(ts: string): boolean {
  return /^\{[\s\S]*\}$/.test((ts ?? '').trim());
}

export function isInlineObjectArray(ts: string): boolean {
  const t = (ts ?? '').trim();
  return /^Array<\{[\s\S]*\}>$/.test(t) || /^\{[\s\S]*\}\[\]$/.test(t);
}

export function baseTs(ts: string): string {
  return (ts ?? 'string').replace(/\s*\|\s*null\b/g, '').trim();
}

export function createIsEnumType(toTsFieldType: (ts: string) => string) {
  return (tsType: string): boolean => {
    const converted = toTsFieldType(tsType);
    const base = converted
      .replace(/\s*\|\s*null\b/g, '')
      .replace(/\[\]$/, '')
      .trim();
    return (
      /^[A-Z][a-zA-Z0-9]*$/.test(base) &&
      ![
        'String',
        'Number',
        'Boolean',
        'Date',
        'ID',
        'Int',
        'Float',
        'GraphQLISODateTime',
        'GraphQLJSON',
        'JSON',
      ].includes(base)
    );
  };
}

export function createFieldUsesDate(graphqlType: (ts: string) => string) {
  return (ts: string): boolean => {
    const b = baseTs(ts);
    const gqlType = graphqlType(b);
    if (gqlType.includes('GraphQLISODateTime')) return true;
    if (isInlineObject(b) || isInlineObjectArray(b)) return /:\s*Date\b/.test(b);
    return false;
  };
}

export function createFieldUsesJSON(graphqlType: (ts: string) => string) {
  return (ts: string): boolean => {
    const b = baseTs(ts);
    const gqlType = graphqlType(b);
    if (gqlType.includes('GraphQLJSON') || gqlType.includes('JSON')) return true;
    if (isInlineObject(b) || isInlineObjectArray(b)) return /:\s*(unknown|any|object)\b/.test(b);
    return false;
  };
}

export function createFieldUsesFloat(graphqlType: (ts: string) => string) {
  return (ts: string): boolean => {
    const b = baseTs(ts);
    const gqlType = graphqlType(b);
    if (gqlType.includes('Float')) return true;
    if (isInlineObject(b) || isInlineObjectArray(b)) {
      const inner = b.trim().startsWith('Array<')
        ? b
            .trim()
            .replace(/^Array<\{/, '{')
            .replace(/}>$/, '}')
        : b.trim().replace(/\[\]$/, '');
      const match = inner.match(/^\{([\s\S]*)\}$/);
      const body = match ? match[1] : '';
      const rawFields = body.split(/[,;]\s*/).filter(Boolean);
      return rawFields.some((f) => {
        const parts = f.split(':');
        const type = parts.slice(1).join(':').trim();
        return type.length > 0 && graphqlType(type).includes('Float');
      });
    }
    return false;
  };
}

export function extractEnumName(tsType: string, toTsFieldType: (ts: string) => string): string {
  return toTsFieldType(tsType)
    .replace(/\s*\|\s*null\b/g, '')
    .replace(/\[\]$/, '')
    .trim();
}

export function createCollectEnumNames(isEnumType: (tsType: string) => boolean, toTsFieldType: (ts: string) => string) {
  return (fields: Array<{ type?: string; tsType?: string }>): string[] => {
    const enumNames = new Set<string>();
    for (const field of fields) {
      const fieldType = field.type ?? field.tsType;
      if (fieldType !== undefined && fieldType !== null && fieldType.length > 0 && isEnumType(fieldType)) {
        enumNames.add(extractEnumName(fieldType, toTsFieldType));
      }
    }
    return Array.from(enumNames).sort();
  };
}
