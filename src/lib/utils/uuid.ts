import { v7 as uuidv7 } from "uuid";

/**
 * Generates a UUID v7 (time-ordered).
 * The timestamp prefix makes IDs naturally sortable by creation time,
 * which improves database index performance for the members table.
 */
export function generateUUID(): string {
  return uuidv7();
}
