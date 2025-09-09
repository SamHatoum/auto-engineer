import { randomBytes } from 'crypto';
import { RANDOM_BYTES, BASE64URL_REGEX } from './constants.js';

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Generate a 64-char base64url token (no prefix). */
export function generateToken(): string {
  const buf = randomBytes(RANDOM_BYTES);
  return toBase64Url(buf); // length 64
}

export function assertSafePrefix(prefix: string): void {
  if (prefix && !BASE64URL_REGEX.test(prefix.replace(/-$/, ''))) {
    throw new Error(`Prefix must be URL-safe (A–Z a–z 0–9 _ -). Got: "${prefix}"`);
  }
}
