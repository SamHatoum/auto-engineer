import { EncryptJWT, importJWK, JWK, type KeyLike } from 'jose';
import fetch from 'node-fetch';
import createDebug from 'debug';

const debug = createDebug('auto:cli:jwe-encryptor');

const PUBLIC_JWKS_URL = 'https://sync-sandbox.rami-632.workers.dev/.well-known/jwks.json';
const PUBLIC_KEY_CACHE_TTL_MS = 60 * 60 * 300; // 1h
const JWE_TTL_SECONDS = 1800;
const AUDIENCE = 'cf-worker-ai';

type JWKS = { keys: JWK[] };
type CachedKey = { keyLike: KeyLike; jwk: JWK; fetchedAt: number };

let cached: CachedKey | null = null;

async function fetchJWKS(): Promise<JWKS> {
  debug('Fetching JWKS: %s', PUBLIC_JWKS_URL);
  const res = await fetch(PUBLIC_JWKS_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Failed JWKS fetch: ${res.status} ${res.statusText}`);
  return (await res.json()) as JWKS;
}

function pickEncryptionKey(jwks: JWKS): JWK {
  const candidate = jwks.keys.find(
    (k) =>
      k.kty === 'RSA' &&
      (k.use === 'enc' || k.use === undefined) &&
      (k.alg === undefined || k.alg === 'RSA-OAEP' || k.alg === 'RSA-OAEP-256') &&
      k.n !== undefined &&
      k.e !== undefined &&
      k.kid !== undefined,
  );
  if (candidate === undefined) throw new Error('No suitable RSA encryption key in JWKS');
  return candidate;
}

async function getCachedPublicKey(): Promise<CachedKey> {
  const now = Date.now();
  if (cached !== null && now - cached.fetchedAt < PUBLIC_KEY_CACHE_TTL_MS) {
    debug('Using cached JWKS key (kid=%s)', cached.jwk.kid);
    return cached;
  }
  const jwks = await fetchJWKS();
  const jwk = pickEncryptionKey(jwks);
  const alg = (jwk.alg as string) ?? 'RSA-OAEP-256';
  const imported = await importJWK(jwk, alg);
  const keyLike = imported instanceof Uint8Array ? imported : imported;
  if (!(keyLike as KeyLike).type) {
    throw new Error('importJWK did not return a valid KeyLike');
  }
  const newCached: CachedKey = { keyLike: keyLike as KeyLike, jwk, fetchedAt: now };
  cached = newCached;
  debug('Cached new JWKS key (kid=%s, alg=%s)', jwk.kid, alg);
  return newCached;
}

export interface TokenPayload {
  apiKey: string;
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'custom';
  model?: string;
  custom?: { name: string; baseUrl: string; defaultModel: string };
}

export async function createJWE(payload: TokenPayload & { roomId: string }): Promise<string> {
  const { keyLike, jwk } = await getCachedPublicKey();
  const now = Math.floor(Date.now() / 1000);

  const jwt = new EncryptJWT({
    apiKey: payload.apiKey,
    provider: payload.provider,
    roomId: payload.roomId,
    model: payload.model,
    custom: payload.custom,
  })
    .setProtectedHeader({
      alg: (jwk.alg as string) ?? 'RSA-OAEP-256',
      enc: 'A256GCM',
      kid: jwk.kid as string,
    })
    .setIssuedAt(now)
    .setExpirationTime(now + JWE_TTL_SECONDS)
    .setAudience(AUDIENCE);

  const jwe = await jwt.encrypt(keyLike);
  debug('Created JWE (kid=%s, exp in %ss)', jwk.kid, JWE_TTL_SECONDS);
  return jwe;
}

export function clearPublicKeyCache(): void {
  cached = null;
}
