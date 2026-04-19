import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
  if (key.length === 64) return Buffer.from(key, "hex");
  if (key.length === 32) return Buffer.from(key, "utf8");
  throw new Error("ENCRYPTION_KEY must be 32 bytes (64-char hex or 32-char UTF-8 string)");
}

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptApiKey(stored: string): string {
  const [ivHex, encHex] = stored.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid encrypted key format");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
