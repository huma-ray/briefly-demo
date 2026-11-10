// AES-256-GCM for API keys people store for their own model endpoint.
// Format: base64(iv[12] | tag[16] | ciphertext). The key is derived from PROVIDER_KEY_SECRET.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFrom(secret: string | undefined): Buffer {
  if (!secret || secret.length < 16) throw new Error("PROVIDER_KEY_SECRET is missing or shorter than 16 characters.");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string, secret = process.env.PROVIDER_KEY_SECRET): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

export function decryptSecret(sealed: string, secret = process.env.PROVIDER_KEY_SECRET): string {
  const raw = Buffer.from(sealed, "base64");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
