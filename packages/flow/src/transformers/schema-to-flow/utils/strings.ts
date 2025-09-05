export function pascal(input: unknown): string {
  // Coerce safely and normalize to a usable string
  const s = typeof input === 'string' ? input : String(input ?? '');
  return s
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * Converts integration name to PascalCase for value imports
 * Handles kebab-case to PascalCase conversion
 *
 * @param name Integration name (e.g., "product-catalog")
 * @returns PascalCase name (e.g., "ProductCatalog")
 */
export function integrationNameToPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
