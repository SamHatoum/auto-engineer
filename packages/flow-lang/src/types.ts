export type Integration<T extends string = string> = {
  readonly __brand: 'Integration';
  readonly type: T;
  readonly name: string;
};

export const createIntegration = <T extends string>(type: T, name: string): Integration<T> => ({
  __brand: 'Integration' as const,
  type,
  name
} as Integration<T>); 