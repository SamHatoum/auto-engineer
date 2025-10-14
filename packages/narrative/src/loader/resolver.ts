import type { IFileStore } from '@auto-engineer/file-store';
import { resolveAbsolute, resolveRelative } from './ts-utils';
import type { Resolved } from './types';

export async function resolveSpecifier(
  vfs: IFileStore,
  spec: string,
  parent: string,
  importMap: Record<string, unknown>,
): Promise<Resolved> {
  if (Object.prototype.hasOwnProperty.call(importMap, spec)) {
    return { kind: 'mapped', value: importMap[spec] };
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const p = await resolveRelative(vfs, spec, parent);
    if (p != null) return { kind: 'vfs', path: p };
  } else if (spec.startsWith('/')) {
    const p = await resolveAbsolute(vfs, spec);
    if (p != null) return { kind: 'vfs', path: p };
  }
  return { kind: 'external', spec };
}
