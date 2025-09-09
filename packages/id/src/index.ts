import { assertSafePrefix, generateToken } from './core.js';

export type GenerateIdOptions = {
  /** Optional string to prepend before the 64-char token. */
  prefix?: string;
};

/**
 * Generate an opaque ID: <prefix?><64 base64url chars>.
 * - Prefix is optional (no default).
 * - Payload is 64 URL-safe Base64 characters (no '=' padding).
 */
export function generateId(opts: GenerateIdOptions = {}): string {
  const prefix = opts.prefix ?? '';
  assertSafePrefix(prefix);
  const token = generateToken(); // 64 chars
  return `${prefix}${token}`;
}
