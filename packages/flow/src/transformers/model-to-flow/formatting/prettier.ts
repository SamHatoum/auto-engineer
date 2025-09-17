import { sortTypeDeclarations } from './sort-types';

function modDefault<T>(m: unknown): T {
  const moduleObj = m as { default?: T };
  return moduleObj?.default ?? (m as T);
}

export async function formatWithPrettier(rawCode: string): Promise<string> {
  try {
    const prettier = modDefault<{ format: (code: string, options: unknown) => Promise<string> }>(
      await import('prettier/standalone'),
    );
    const tsPlugin = modDefault<unknown>(await import('prettier/plugins/typescript'));
    const estreePlugin = modDefault<unknown>(await import('prettier/plugins/estree'));

    const cfg = {
      parser: 'typescript' as const,
      singleQuote: true,
      semi: true,
      trailingComma: 'all' as const,
      printWidth: 120,
      plugins: [tsPlugin, estreePlugin],
    };

    let formatted = await prettier.format(rawCode, cfg);
    formatted = sortTypeDeclarations(formatted);
    formatted = await prettier.format(formatted, cfg);

    return formatted;
  } catch (err) {
    console.warn('Prettier formatting failed, returning unformatted code:', err);
    return rawCode;
  }
}
