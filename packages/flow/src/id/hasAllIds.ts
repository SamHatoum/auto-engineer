import { Model, Slice } from '../index';

function hasValidId(item: { id?: string }): boolean {
  return item.id !== undefined && item.id !== '';
}

function hasServerSpecIds(slice: Slice): boolean {
  if (!('server' in slice) || slice.server?.specs?.rules === undefined) return true;
  return slice.server.specs.rules.every(hasValidId);
}

function hasInteractionSpecIds(slice: Slice): boolean {
  if (!('interaction' in slice) || slice.interaction?.specs?.rules === undefined) return true;
  return slice.interaction.specs.rules.every(hasValidId);
}

function hasSliceIds(slice: Slice): boolean {
  return hasValidId(slice) && hasServerSpecIds(slice) && hasInteractionSpecIds(slice);
}

export function hasAllIds(specs: Model): boolean {
  return specs.flows.every((flow) => hasValidId(flow) && flow.slices.every(hasSliceIds));
}
