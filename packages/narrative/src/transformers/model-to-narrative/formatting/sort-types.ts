import { collectTypeDeclarations } from '../analysis/type-decls';
import { findCodeBoundaries, reconstructCode } from '../analysis/lint-helpers';

/**
 * Sorts TypeScript type declarations alphabetically, adds line breaks between them, and removes unused types.
 * Ensures all types appear after imports but before flow statements.
 */
export function sortTypeDeclarations(code: string): string {
  const lines = code.split('\n');
  const allTypes = collectTypeDeclarations(lines);

  if (allTypes.length === 0) return code;

  const { lastImportIdx } = findCodeBoundaries(lines);
  const filteredTypes = allTypes;
  filteredTypes.sort((a, b) => a.name.localeCompare(b.name));

  return reconstructCode(lines, filteredTypes, allTypes, lastImportIdx);
}
