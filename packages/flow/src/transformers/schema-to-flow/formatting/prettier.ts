import { sortTypeDeclarations } from './sort-types';

export async function formatWithPrettier(rawCode: string): Promise<string> {
  try {
    const prettier = await import('prettier');

    const prettierConfig = {
      parser: 'typescript' as const,
      singleQuote: true,
      semi: true,
      trailingComma: 'all' as const,
      printWidth: 120,
      plugins: ['prettier-plugin-organize-imports'],
    };

    let formattedCode = await prettier.format(rawCode, prettierConfig);

    // Apply custom formatting for type declarations (before final prettier pass)
    formattedCode = sortTypeDeclarations(formattedCode);

    // Final formatting pass after modifications
    formattedCode = await prettier.format(formattedCode, prettierConfig);

    return formattedCode;
  } catch (error) {
    console.warn('Prettier formatting failed, returning unformatted code:', error);
    return rawCode;
  }
}
