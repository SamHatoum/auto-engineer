import { generateAutoId } from './generators';
import { Model, Slice } from '../index';

function ensureId(item: { id?: string }): void {
  if (item.id === undefined || item.id === '') {
    item.id = generateAutoId();
  }
}

function addRuleIds(rules: Array<unknown>): Array<unknown> {
  return rules.map((rule) => {
    if (typeof rule === 'object' && rule !== null && 'description' in rule) {
      const ruleCopy = { ...rule } as { id?: string };
      ensureId(ruleCopy);
      return ruleCopy;
    }
    return rule;
  });
}

function processServerSpecs(slice: Slice): Slice {
  if (!('server' in slice) || slice.server?.specs?.rules === undefined) return slice;

  const modifiedSlice = structuredClone(slice);
  if ('server' in modifiedSlice && modifiedSlice.server?.specs?.rules !== undefined) {
    (modifiedSlice.server.specs as { rules: unknown[] }).rules = addRuleIds(modifiedSlice.server.specs.rules);
  }
  return modifiedSlice;
}

function processClientSpecs(slice: Slice): Slice {
  // Client specs use string rules (no IDs needed), so nothing to process
  return slice;
}

function processSlice(slice: Slice): Slice {
  let sliceCopy = { ...slice };
  ensureId(sliceCopy);
  sliceCopy = processServerSpecs(sliceCopy);
  sliceCopy = processClientSpecs(sliceCopy);
  return sliceCopy;
}

export function addAutoIds(specs: Model): Model {
  const result = structuredClone(specs);
  result.flows = result.flows.map((flow) => {
    const flowCopy = { ...flow };
    ensureId(flowCopy);
    flowCopy.slices = flow.slices.map(processSlice);
    return flowCopy;
  });
  return result;
}
