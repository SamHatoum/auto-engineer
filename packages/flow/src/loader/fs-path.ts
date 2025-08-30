export const toPosix = (p: string) => p.replace(/\\/g, '/');

export function dirname(p: string) {
  const posix = toPosix(p);
  const idx = posix.lastIndexOf('/');
  return idx > 0 ? posix.slice(0, idx) : '/';
}

export function join(a: string, b: string) {
  const aa = toPosix(a).replace(/\/+$/, '');
  const bb = toPosix(b).replace(/^\/+/, '');
  return (aa ? aa + '/' : '/') + bb;
}

export function normalize(path: string): string {
  const parts = toPosix(path).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (out.length) out.pop();
      continue;
    }
    out.push(part);
  }
  return '/' + out.join('/');
}

export const CANDIDATE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
