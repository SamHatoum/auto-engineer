import { collectTypeDeclarations } from '../analysis/type-decls';
import { findCodeBoundaries, reconstructCode, extractIntegrationNames } from '../analysis/lint-helpers';
import { analyzeCodeUsage } from '../analysis/usage';

/**
 * Sorts TypeScript type declarations alphabetically, adds line breaks between them, and removes unused types.
 * Ensures all types appear after imports but before flow statements.
 */
export function sortTypeDeclarations(code: string): string {
  const lines = code.split('\n');
  const allTypes = collectTypeDeclarations(lines);

  if (allTypes.length === 0) return code;

  const { lastImportIdx } = findCodeBoundaries(lines);
  const filteredTypes = getFilteredTypes(code, allTypes);
  filteredTypes.sort((a, b) => a.name.localeCompare(b.name));

  return reconstructCode(lines, filteredTypes, allTypes, lastImportIdx);
}

function getFilteredTypes(
  code: string,
  allTypes: Array<{ name: string; startIdx: number; endIdx: number }>,
): Array<{ name: string; startIdx: number; endIdx: number }> {
  const allIntegrationNames = extractIntegrationNames(code);
  const usageAnalysis = analyzeCodeUsage(
    code,
    allTypes.map((t) => t.name),
    [],
    allIntegrationNames,
  );

  return allTypes.filter((t) => usageAnalysis.usedTypes.has(t.name));
}
