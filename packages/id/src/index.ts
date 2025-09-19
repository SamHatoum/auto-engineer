import { assertSafePrefix, generateBase62Token } from './core.js';

export type GenerateIdOptions = {
  /** Optional string to prepend before the token. (URL-safe; trailing '-' ok) */
  prefix?: string;
  /** Token length; default 9 (base-62). */
  length?: number;
};

/** Generate ID: <prefix?><base-62 token>. Default token: 9 chars. */
export function generateId(opts: GenerateIdOptions = {}): string {
  const { prefix = '', length = 9 } = opts;
  assertSafePrefix(prefix);
  const token = generateBase62Token(length);
  return `${prefix}${token}`;
}
