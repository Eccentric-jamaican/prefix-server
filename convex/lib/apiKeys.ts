import { API_KEY_PREFIX, API_KEY_PREFIX_LENGTH } from "./constants.js";

export interface GeneratedApiKey {
  secret: string;
  prefix: string;
  hash: string;
}

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const random = randomHex(32);
  const secret = `${API_KEY_PREFIX}_${random}`;
  const prefix = secret.slice(0, API_KEY_PREFIX_LENGTH);
  const hash = await hashApiKey(secret);
  return { secret, prefix, hash };
}

export async function hashApiKey(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return bytesToHex(new Uint8Array(digest));
}

function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return bytesToHex(array);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
