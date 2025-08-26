export const toPosix = (p: string) => p.replace(/\\/g, '/');

export const dirname = (p: string) => {
  const n = toPosix(p);
  const i = n.lastIndexOf('/');
  return i <= 0 ? '/' : n.slice(0, i);
};

export const join = (...parts: string[]) => {
  const filtered = parts.filter(Boolean);
  if (!filtered.length) return '/';
  const absolute = filtered[0].startsWith('/');
  const joined = toPosix(filtered.map((s) => s.replace(/^\/+|\/+$/g, '')).join('/'));
  return absolute ? `/${joined}` : joined;
};
