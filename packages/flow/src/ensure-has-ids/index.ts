import { generateAutoId } from './generators';
import { Model } from '../index';

export function ensureHasIds(specs: Model): Model {
  const result = structuredClone(specs);
  result.flows = result.flows.map((flow) => {
    const flowCopy = { ...flow };
    if (flowCopy.id === undefined || flowCopy.id === '') {
      flowCopy.id = generateAutoId();
    }
    flowCopy.slices = flow.slices.map((slice) => {
      const sliceCopy = { ...slice };
      if (sliceCopy.id === undefined || sliceCopy.id === '') {
        sliceCopy.id = generateAutoId();
      }
      if (
        sliceCopy.server !== undefined &&
        sliceCopy.server.specs !== undefined &&
        sliceCopy.server.specs.rules !== undefined
      ) {
        sliceCopy.server = {
          ...sliceCopy.server,
          specs: {
            ...sliceCopy.server.specs,
            rules: sliceCopy.server.specs.rules.map((rule) => {
              const ruleCopy = { ...rule };
              if (ruleCopy.id === undefined || ruleCopy.id === '') {
                ruleCopy.id = generateAutoId();
              }
              return ruleCopy;
            }),
          },
        };
      }
      return sliceCopy;
    });
    return flowCopy;
  });
  return result;
}
