import { sanitizeText, validateAadhaar, validatePhone } from "@/lib/security/sanitizer";

describe("Sanitizer", () => {
  describe("sanitizeText", () => {
    it("should strip HTML tags", () => {
      expect(sanitizeText("<script>alert('xss')</script>Hello")).toBe("Hello");
      expect(sanitizeText("<b>Bold</b>")).toBe("Bold");
      expect(sanitizeText("Plain text")).toBe("Plain text");
    });

    it("should preserve Tamil text", () => {
      const tamil = "ரவி குமார்";
      expect(sanitizeText(tamil)).toBe(tamil);
    });
  });

  describe("validateAadhaar", () => {
    it("should accept valid 12-digit Aadhaar", () => {
      expect(validateAadhaar("123456789012")).toBe(true);
      expect(validateAadhaar("1234 5678 9012")).toBe(true); // with spaces
    });

    it("should reject invalid Aadhaar", () => {
      expect(validateAadhaar("12345678901")).toBe(false); // 11 digits
      expect(validateAadhaar("1234567890123")).toBe(false); // 13 digits
      expect(validateAadhaar("abcdefghijkl")).toBe(false); // letters
    });
  });

  describe("validatePhone", () => {
    it("should accept valid Indian mobile numbers", () => {
      expect(validatePhone("9876543210")).toBe(true);
      expect(validatePhone("6789012345")).toBe(true);
    });

    it("should reject invalid phones", () => {
      expect(validatePhone("1234567890")).toBe(false); // starts with 1
      expect(validatePhone("987654321")).toBe(false); // 9 digits
    });
  });
});
