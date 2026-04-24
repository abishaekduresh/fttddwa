import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless HMAC-signed PDF tokens.
 *
 * Token format (base64url-encoded):  <uuid>:<exp_ms>:<hmac_sig>
 *
 * No in-memory store — works correctly across Next.js App Router route
 * module isolation, multiple processes, and serverless environments.
 * Tokens are valid for 10 minutes after creation.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSecret(): string {
  return process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "dev-pdf-token-secret";
}

/** Issue a time-limited signed token for the given member UUID. */
export function createPdfToken(memberUuid: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${memberUuid}:${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

/**
 * Verify and decode a PDF token.
 * Returns the member UUID if the token is valid and not expired,
 * otherwise null.
 */
export function consumePdfToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");

    // Split off the last segment as the signature
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return null;

    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);

    // Verify HMAC
    const expectedSig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expectedSig, "utf8"))) return null;

    // Parse payload: <uuid>:<exp_ms>
    const firstColon = payload.indexOf(":");
    if (firstColon === -1) return null;

    const memberUuid = payload.slice(0, firstColon);
    const exp = parseInt(payload.slice(firstColon + 1), 10);

    if (!memberUuid || isNaN(exp) || Date.now() > exp) return null;

    return memberUuid;
  } catch {
    return null;
  }
}
