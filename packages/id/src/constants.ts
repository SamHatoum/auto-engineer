export const BASE63_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';

/** Valid token chars (exactly base-63 alphabet above). */
export const BASE63_TOKEN_REGEX = /^[A-Za-z0-9_]+$/;

/** Allow broader, URL-safe prefixes; trailing '-' is permitted as a separator. */
export const SAFE_PREFIX_REGEX = /^[A-Za-z0-9_-]+$/;
