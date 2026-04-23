import { randomUUID } from "crypto";

/**
 * Generates a standard UUID v4.
 * Uses Node.js built-in crypto — no external packages needed.
 */
export function generateUUID(): string {
  return randomUUID();
}
