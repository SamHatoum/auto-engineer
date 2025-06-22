export const flow = (name: string, fn: () => void) => fn;

export const client = (name: string, fn: () => void) => fn;
export const server = (name: string, fn: () => void) => fn;

export const request = (query: any) => ({
  with: (...dependencies: any[]) => { }
});

function specs(name: string, fn: () => void): () => void;
function specs(fn: () => void): () => void;
function specs(nameOrFn: string | (() => void), fn?: () => void): () => void {
  if (typeof nameOrFn === 'string') {
    return fn || (() => {});
  } else {
    return nameOrFn;
  }
}
export { specs };

const shouldFn = (description: string) => ({
  with: (...dependencies: any[]) => { }
});

shouldFn.not = (description: string) => ({
  with: (...dependencies: any[]) => { }
});

export const should = shouldFn; 