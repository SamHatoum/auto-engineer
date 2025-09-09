import { randomBytes } from 'crypto';
import { BASE63_ALPHABET, SAFE_PREFIX_REGEX } from './constants.js';

const BASE = BASE63_ALPHABET.length;
const ACCEPT_BOUND = Math.floor(256 / BASE) * BASE;

export function assertSafePrefix(prefix: string): void {
  const check = prefix.replace(/-$/, '');
  if (check && !SAFE_PREFIX_REGEX.test(check)) {
    throw new Error(`Prefix must be URL-safe (A–Z a–z 0–9 _ -). Got: "${prefix}"`);
  }
}

/** Unbiased base-63 token using rejection sampling. Default: 9 chars. */
export function generateBase63Token(length = 9): string {
  const out: string[] = [];
  while (out.length < length) {
    // Pull a small batch; loop continues only if we need more accepted bytes.
    const buf = randomBytes(length);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const byte = buf[i];
      if (byte >= ACCEPT_BOUND) continue; // reject to avoid modulo bias
      out.push(BASE63_ALPHABET[byte % BASE]);
    }
  }
  return out.join('');
}
