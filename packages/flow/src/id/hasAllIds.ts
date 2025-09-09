import { Model } from '../index';

export function hasAllIds(specs: Model): boolean {
  return specs.flows.every((flow) => {
    if (flow.id === undefined || flow.id === '') return false;

    return flow.slices.every((slice) => {
      if (slice.id === undefined || slice.id === '') return false;

      if (slice.server !== undefined && slice.server.specs !== undefined && slice.server.specs.rules !== undefined) {
        return slice.server.specs.rules.every((rule) => rule.id !== undefined && rule.id !== '');
      }

      return true;
    });
  });
}
