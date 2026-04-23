import { randomUUID } from "crypto";

interface PdfTokenEntry {
  memberUuid: string;
  expiresAt: number;
}

// Module-level singleton — survives across requests in the same Node.js process.
// Single-use: token is deleted the moment it is consumed (valid OR expired).
const store = new Map<string, PdfTokenEntry>();

const TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Remove expired entries to keep memory tidy. Called on every write. */
function prune() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.expiresAt) store.delete(k);
  }
}

/** Create a single-use PDF token for the given member UUID. */
export function createPdfToken(memberUuid: string): string {
  prune();
  const token = randomUUID();
  store.set(token, { memberUuid, expiresAt: Date.now() + TTL_MS });
  return token;
}

/**
 * Consume a token — deletes it immediately (single-use) and returns the
 * associated member UUID. Returns `null` if the token is unknown or expired.
 */
export function consumePdfToken(token: string): string | null {
  const entry = store.get(token);
  store.delete(token); // always delete — prevents replay regardless of expiry
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.memberUuid;
}
