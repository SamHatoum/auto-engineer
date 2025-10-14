import { Model, Slice } from '../index';

function hasValidId(item: { id?: string }): boolean {
  return item.id !== undefined && item.id !== '';
}

function hasServerSpecIds(slice: Slice): boolean {
  if (!('server' in slice) || slice.server?.specs?.rules === undefined) return true;
  return slice.server.specs.rules.every(hasValidId);
}

function hasClientSpecIds(_slice: Slice): boolean {
  // Client specs use string rules (no IDs needed), so always valid
  return true;
}

function hasSliceIds(slice: Slice): boolean {
  return hasValidId(slice) && hasServerSpecIds(slice) && hasClientSpecIds(slice);
}

export function hasAllIds(specs: Model): boolean {
  return specs.narratives.every((narrative) => hasValidId(narrative) && narrative.slices.every(hasSliceIds));
}
