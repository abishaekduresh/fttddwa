import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";

describe("JWT utilities", () => {
  const payload = { userId: 1, email: "test@example.com", role: "ADMIN", roleId: 2 };

  it("should sign and verify access token", async () => {
    const token = await signAccessToken(payload);
    expect(typeof token).toBe("string");

    const decoded = await verifyAccessToken(token);
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it("should return null for invalid access token", async () => {
    const result = await verifyAccessToken("invalid.token.here");
    expect(result).toBeNull();
  });

  it("should sign and verify refresh token", async () => {
    const token = await signRefreshToken({ userId: 1, sessionId: 5 });
    const decoded = await verifyRefreshToken(token);
    expect(decoded?.userId).toBe(1);
    expect(decoded?.sessionId).toBe(5);
  });

  it("should return null for invalid refresh token", async () => {
    const result = await verifyRefreshToken("bad.token");
    expect(result).toBeNull();
  });
});
