/**
 * Bring-your-own AI key storage — encrypted at rest.
 *
 * - AES-GCM via Web Crypto (Workers-safe, no Node crypto).
 * - The AES key is derived with PBKDF2-SHA-256 from `AI_KEYS_ENCRYPTION_SECRET`
 *   (falls back to `BETTER_AUTH_SECRET`). No plaintext key ever touches D1.
 * - The UI only ever sees `provider` + a last-4 `hint`. The full plaintext is
 *   returned by `getDecryptedUserAiKey` for server-side agent use only.
 * - Nothing here logs ciphertext or plaintext.
 *
 * Workers AI remains the default. A stored key is opt-in and is not wired into
 * `worker/chat-agent.ts` yet (see the note there).
 */

export type UserAiKeyEnv = {
  DB?: D1Database;
  AI_KEYS_ENCRYPTION_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
};

export const AI_KEY_PROVIDERS = ["workers_ai", "openai", "anthropic"] as const;
export type AiKeyProvider = (typeof AI_KEY_PROVIDERS)[number];

export function isAiKeyProvider(v: string): v is AiKeyProvider {
  return (AI_KEY_PROVIDERS as readonly string[]).includes(v);
}

export type UserAiKeyMeta = {
  provider: AiKeyProvider;
  hint: string;
  updatedAt: string;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function secretOf(env: UserAiKeyEnv): string {
  return (
    env.AI_KEYS_ENCRYPTION_SECRET ||
    env.BETTER_AUTH_SECRET ||
    "dev-only-change-me-bismillah-32chars!!"
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function deriveKey(
  env: UserAiKeyEnv,
  salt: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretOf(env)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Returns `salt.iv.ciphertext`, each segment base64. */
async function encryptSecret(env: UserAiKeyEnv, plaintext: string): Promise<string> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(env, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return [
    bytesToBase64(salt),
    bytesToBase64(iv),
    bytesToBase64(new Uint8Array(ct)),
  ].join(".");
}

async function decryptSecret(env: UserAiKeyEnv, packed: string): Promise<string | null> {
  try {
    const [saltB64, ivB64, ctB64] = packed.split(".");
    if (!saltB64 || !ivB64 || !ctB64) return null;
    const key = await deriveKey(env, base64ToBytes(saltB64));
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(ivB64) },
      key,
      base64ToBytes(ctB64)
    );
    return dec.decode(pt);
  } catch {
    // wrong secret / corrupt row — treat as "no key"
    return null;
  }
}

function hintOf(plaintext: string): string {
  const tail = plaintext.trim().slice(-4);
  return tail ? `••••${tail}` : "";
}

export async function saveUserAiKey(
  env: UserAiKeyEnv,
  userId: string,
  provider: AiKeyProvider,
  plaintextKey: string
): Promise<{ ok: boolean; error?: string; meta?: UserAiKeyMeta }> {
  if (!env.DB) return { ok: false, error: "database unavailable" };
  const key = plaintextKey.trim();
  if (provider !== "workers_ai" && key.length < 8) {
    return { ok: false, error: "key looks too short" };
  }

  const now = new Date().toISOString();
  const ciphertext = await encryptSecret(env, key);
  const hint = hintOf(key);

  try {
    await env.DB.prepare(
      `INSERT INTO user_ai_keys (user_id, provider, key_ciphertext, key_hint, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(user_id) DO UPDATE SET
         provider = ?2, key_ciphertext = ?3, key_hint = ?4, updated_at = ?5`
    )
      .bind(userId, provider, ciphertext, hint, now)
      .run();
  } catch (err) {
    console.error("[user-ai-keys] save failed", err);
    return { ok: false, error: "could not save key" };
  }

  return { ok: true, meta: { provider, hint, updatedAt: now } };
}

export async function getUserAiKeyMeta(
  env: UserAiKeyEnv,
  userId: string
): Promise<UserAiKeyMeta | null> {
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(
      "SELECT provider, key_hint, updated_at FROM user_ai_keys WHERE user_id = ?"
    )
      .bind(userId)
      .first<{ provider: string; key_hint: string; updated_at: string }>();
    if (!row) return null;
    const provider = isAiKeyProvider(row.provider) ? row.provider : "workers_ai";
    return { provider, hint: row.key_hint ?? "", updatedAt: row.updated_at };
  } catch (err) {
    console.error("[user-ai-keys] meta read failed", err);
    return null;
  }
}

/** Server-only: decrypt for agent use. Never expose this over an API response. */
export async function getDecryptedUserAiKey(
  env: UserAiKeyEnv,
  userId: string
): Promise<{ provider: AiKeyProvider; key: string } | null> {
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(
      "SELECT provider, key_ciphertext FROM user_ai_keys WHERE user_id = ?"
    )
      .bind(userId)
      .first<{ provider: string; key_ciphertext: string }>();
    if (!row) return null;
    const key = await decryptSecret(env, row.key_ciphertext);
    if (!key) return null;
    const provider = isAiKeyProvider(row.provider) ? row.provider : "workers_ai";
    return { provider, key };
  } catch (err) {
    console.error("[user-ai-keys] decrypt read failed", err);
    return null;
  }
}

export async function deleteUserAiKey(
  env: UserAiKeyEnv,
  userId: string
): Promise<{ ok: boolean }> {
  if (!env.DB) return { ok: false };
  try {
    await env.DB.prepare("DELETE FROM user_ai_keys WHERE user_id = ?")
      .bind(userId)
      .run();
    return { ok: true };
  } catch (err) {
    console.error("[user-ai-keys] delete failed", err);
    return { ok: false };
  }
}
