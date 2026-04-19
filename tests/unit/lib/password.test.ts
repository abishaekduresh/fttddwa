import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/password";

describe("Password utilities", () => {
  it("should hash and verify password", async () => {
    const password = "TestPass@123";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2b$")).toBe(true);

    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it("should reject wrong password", async () => {
    const hash = await hashPassword("CorrectPass@1");
    const valid = await verifyPassword("WrongPass@1", hash);
    expect(valid).toBe(false);
  });

  it("should validate password strength", () => {
    expect(validatePasswordStrength("StrongP@ss1").valid).toBe(true);
    expect(validatePasswordStrength("weak").valid).toBe(false);
    expect(validatePasswordStrength("alllowercase1@").valid).toBe(false);
    expect(validatePasswordStrength("ALLUPPERCASE1@").valid).toBe(false);
    expect(validatePasswordStrength("NoSpecialChar1").valid).toBe(false);
    expect(validatePasswordStrength("NoNumber@Pass").valid).toBe(false);
  });
});
