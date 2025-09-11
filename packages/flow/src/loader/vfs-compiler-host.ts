import { toPosix } from './fs-path';

export function createVfsCompilerHost(
  ts: typeof import('typescript'),
  sourceFiles: Map<string, import('typescript').SourceFile>,
  opts?: { caseSensitive?: boolean; defaultLibFileName?: string },
): import('typescript').CompilerHost {
  const caseSensitive = opts?.caseSensitive ?? true;
  const defaultLib = opts?.defaultLibFileName ?? 'lib.d.ts';
  const NL = '\n';

  const isDefaultLib = (file: string) => /(^|\/)lib\.[^/]+\.d\.ts$/.test(file) || toPosix(file) === defaultLib;

  const getFromVfs = (fileName: string) => {
    const posix = toPosix(fileName);
    return sourceFiles.get(posix) ?? null;
  };

  return {
    getSourceFile: (fileName, languageVersion) => {
      const v = getFromVfs(fileName);
      if (v) return v;

      if (isDefaultLib(fileName)) {
        // Empty lib keeps TS happy with skipLibCheck
        return ts.createSourceFile(toPosix(fileName), '', languageVersion, true, ts.ScriptKind.TS);
      }
      return undefined;
    },
    getDefaultLibFileName: () => defaultLib,
    writeFile: () => {},
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    getCanonicalFileName: (f) => (caseSensitive ? f : f.toLowerCase()),
    useCaseSensitiveFileNames: () => caseSensitive,
    getNewLine: () => NL,

    // Commonly used
    fileExists: (fileName) => {
      if (getFromVfs(fileName)) return true;
      if (isDefaultLib(fileName)) return true;
      return false;
    },
    readFile: (fileName) => {
      const v = getFromVfs(fileName);
      if (v) return v.getFullText();
      if (isDefaultLib(fileName)) return '';
      return undefined;
    },
  };
}
