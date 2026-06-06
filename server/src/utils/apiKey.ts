import { createHash, randomBytes } from "crypto";

const PREFIX = "vtk_";

export interface GeneratedKey {
  key: string; // full secret, shown to the user exactly once
  key_prefix: string; // safe-to-store identifier shown in the UI
  key_hash: string; // sha256 of the full key, stored for lookup
}

export function generateApiKey(): GeneratedKey {
  const secret = randomBytes(24).toString("hex"); // 48 hex chars, 192 bits
  const key = `${PREFIX}${secret}`;
  return { key, key_prefix: key.slice(0, 12), key_hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function looksLikeApiKey(token: string): boolean {
  return token.startsWith(PREFIX);
}
