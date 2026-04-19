/**
 * Format a phone number to WhatsApp format using a dynamic country code.
 * Example: phone="7788443543", countryCode="+91" -> "917788443543"
 */
export function formatPhoneForWhatsApp(phone: string, countryCode: string = "91"): string {
  // 1. Clean digits from input and prefix
  const digits = phone.replace(/\D/g, "");
  const prefix = countryCode.replace(/\D/g, "");
  
  // 2. If it already starts with the prefix and has the right length, return it
  if (digits.startsWith(prefix) && digits.length > 10) return digits;
  
  // 3. Otherwise, prepend the prefix to the 10-digit number
  const last10 = digits.slice(-10);
  if (last10.length === 10) return `${prefix}${last10}`;
  
  throw new Error(`Cannot format phone number: "${phone}" — expected at least 10 digits`);
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}
