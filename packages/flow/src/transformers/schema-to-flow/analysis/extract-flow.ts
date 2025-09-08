import { collectTypeDeclarations } from './type-decls';

export function extractFlowCode(code: string): string {
  const lines = code.split('\n');
  const typeRanges = new Set<number>();

  // Collect all type declarations
  const allTypes = collectTypeDeclarations(lines);

  // Mark all lines in type declarations as excluded
  for (const type of allTypes) {
    for (let i = type.startIdx; i <= type.endIdx; i++) {
      typeRanges.add(i);
    }
  }

  // Extract flow lines (everything that's not a type declaration)
  const flowLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!typeRanges.has(i)) {
      flowLines.push(lines[i]);
    }
  }

  return flowLines.join('\n');
}
