function isStringStart(char: string): boolean {
  return char === '"' || char === "'" || char === '`';
}

function updateBracketCounts(char: string, counts: { braceCount: number; angleCount: number }): void {
  if (char === '{') counts.braceCount++;
  else if (char === '}') counts.braceCount--;
  else if (char === '<') counts.angleCount++;
  else if (char === '>') counts.angleCount--;
}

function countBrackets(text: string): {
  braceCount: number;
  angleCount: number;
  inString: boolean;
  stringChar: string;
} {
  const counts = { braceCount: 0, angleCount: 0 };
  let inString = false;
  let stringChar = '';

  for (const char of text) {
    if (!inString && isStringStart(char)) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar) {
      inString = false;
    } else if (!inString) {
      updateBracketCounts(char, counts);
    }
  }

  return { ...counts, inString, stringChar };
}

function findTypeDeclarationEnd(
  lines: string[],
  startIdx: number,
  initialCounts: { braceCount: number; angleCount: number },
): number {
  let endIdx = startIdx;
  let { braceCount, angleCount } = initialCounts;

  if (braceCount > 0 || angleCount > 0) {
    for (let j = startIdx + 1; j < lines.length; j++) {
      endIdx = j;
      const nextLine = lines[j];

      const counts = countBrackets(nextLine);
      braceCount += counts.braceCount;
      angleCount += counts.angleCount;

      if (braceCount === 0 && angleCount === 0 && nextLine.trim().endsWith(';')) {
        break;
      }

      if (nextLine.match(/^type\s+\w+/)) {
        endIdx = j - 1;
        break;
      }
    }
  }

  return endIdx;
}

export function collectTypeDeclarations(lines: string[]): Array<{ name: string; startIdx: number; endIdx: number }> {
  const allTypes: Array<{ name: string; startIdx: number; endIdx: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^type\s+\w+/)) {
      const typeName = extractTypeName(line);
      const startIdx = i;

      // Count opening braces/angles on the first line
      const initialCounts = countBrackets(line);

      // Find the end of this type declaration
      const endIdx = findTypeDeclarationEnd(lines, startIdx, initialCounts);

      allTypes.push({ name: typeName, startIdx, endIdx });
      i = endIdx; // Skip to end of this type
    }
  }

  return allTypes;
}

export function extractTypeName(typeLine: string): string {
  const match = typeLine.match(/^type\s+(\w+)/);
  return match ? match[1] : '';
}
