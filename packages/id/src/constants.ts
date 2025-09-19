export const BASE62_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Valid token chars (exactly base-62 alphabet above). */
export const BASE62_TOKEN_REGEX = /^[A-Za-z0-9]+$/;

/** Allow broader, URL-safe prefixes; trailing '-' is permitted as a separator. */
export const SAFE_PREFIX_REGEX = /^[A-Za-z0-9_-]+$/;
