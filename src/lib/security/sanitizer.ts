import sanitizeHtml from "sanitize-html";

// Strip all HTML tags — allow only plain text
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  const sanitized = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();

  // Unescape common HTML entities that sanitize-html escapes
  return sanitized
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export function validateAadhaar(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/\s/g, "");
  return /^\d{12}$/.test(cleaned);
}

export function validatePhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s|-/g, ""));
}

export function normalizeAadhaar(aadhaar: string): string {
  return aadhaar.replace(/\s/g, "");
}
