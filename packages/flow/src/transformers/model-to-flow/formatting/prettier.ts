import { sortTypeDeclarations } from './sort-types';

async function tryImportPlugin(pluginName: string): Promise<boolean> {
  try {
    // Use dynamic import with string concatenation to avoid TypeScript module resolution issues
    await eval(`import('${pluginName}')`);
    return true;
  } catch {
    return false;
  }
}

export async function formatWithPrettier(rawCode: string): Promise<string> {
  try {
    const prettier = await import('prettier');
    // Try to determine available plugins
    const plugins = ['prettier-plugin-organize-imports'];
    const hasTypeScriptPlugin = await tryImportPlugin('@prettier/plugin-typescript');
    if (hasTypeScriptPlugin) {
      plugins.push('@prettier/plugin-typescript');
    }

    const prettierConfig = {
      parser: 'typescript' as const,
      singleQuote: true,
      semi: true,
      trailingComma: 'all' as const,
      printWidth: 120,
      plugins,
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
