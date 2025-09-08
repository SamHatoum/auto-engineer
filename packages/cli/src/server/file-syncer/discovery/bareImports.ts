import { NodeFileStore } from '@auto-engineer/file-store';

const BARE_IMPORT_RE =
  /\bfrom\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

function isBare(spec: string) {
  return !!spec && !spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('node:');
}
function basePackageOf(spec: string): string {
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  const i = spec.indexOf('/');
  return i === -1 ? spec : spec.slice(0, i);
}

export async function collectBareImportsFromFiles(files: string[], vfs: NodeFileStore): Promise<string[]> {
  const pkgs = new Set<string>();
  for (const abs of files) {
    if (!/\.(m?ts|m?js|tsx|jsx)$/i.test(abs)) continue;
    try {
      const buf = await vfs.read(abs);
      if (!buf) continue;
      const src = new TextDecoder().decode(buf);
      for (const m of src.matchAll(BARE_IMPORT_RE)) {
        const raw = (m[1] ?? m[2] ?? m[3] ?? '').trim();
        if (!isBare(raw)) continue;
        pkgs.add(basePackageOf(raw));
      }
    } catch {
      // ignore per-file errors
    }
  }
  return [...pkgs];
}
