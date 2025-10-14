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
