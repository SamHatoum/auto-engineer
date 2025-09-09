import ts from 'typescript';

export function isTypeReferenceMethod(methodName: string): boolean {
  return ['event', 'state', 'command'].includes(methodName);
}

export function processTypeMatching(text: string, typeNames: string[], usedTypes: Set<string>): void {
  for (const typeName of typeNames) {
    if (text === typeName) {
      usedTypes.add(typeName);
      break;
    }
  }
}

export function checkCallExpressionContext(call: ts.CallExpression): string | null {
  if (call.expression === null || call.expression === undefined || !ts.isPropertyAccessExpression(call.expression)) {
    return null;
  }

  const methodName = call.expression.name.text;
  return isTypeReferenceMethod(methodName) ? methodName : null;
}

export function extractIntegrationNames(code: string): string[] {
  const integrationMatch = code.match(/import\s+{[^}]*}\s+from\s+['"][^'"]*integrations['"]/);

  if (integrationMatch) {
    const importMatch = integrationMatch[0].match(/{([^}]*)}/);
    if (importMatch) {
      return importMatch[1]
        .split(',')
        .map((name) => name.replace(/^type\s+/, '').trim())
        .filter((name) => name.length > 0);
    }
  }
  return [];
}

export function findCodeBoundaries(lines: string[]): { lastImportIdx: number } {
  let lastImportIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s*import\s/)) {
      lastImportIdx = i;
    } else if (lines[i].includes('flow(')) {
      break;
    }
  }

  return { lastImportIdx };
}

export function reconstructCode(
  lines: string[],
  filteredTypes: Array<{ name: string; startIdx: number; endIdx: number }>,
  allTypes: Array<{ name: string; startIdx: number; endIdx: number }>,
  lastImportIdx: number,
): string {
  const result: string[] = [];

  // Add imports section
  for (let i = 0; i <= lastImportIdx; i++) {
    result.push(lines[i]);
  }

  // Add blank line before types
  result.push('');

  // Add sorted types
  filteredTypes.forEach((type, index) => {
    for (let i = type.startIdx; i <= type.endIdx; i++) {
      result.push(lines[i]);
    }
    if (index < filteredTypes.length - 1) {
      result.push(''); // Blank line between types
    }
  });

  // Add blank line after types
  result.push('');

  // Add everything after imports that isn't a type declaration
  const typeRanges = new Set<number>();
  for (const type of allTypes) {
    for (let i = type.startIdx; i <= type.endIdx; i++) {
      typeRanges.add(i);
    }
  }

  for (let i = lastImportIdx + 1; i < lines.length; i++) {
    if (!typeRanges.has(i)) {
      result.push(lines[i]);
    }
  }

  return result.join('\n');
}
