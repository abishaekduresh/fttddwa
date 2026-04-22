import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface AccessTokenPayload extends JWTPayload {
  userId: number;
  name: string;
  email: string;
  role: string;
  roleId: number;
  permissions: string[];
}

export interface RefreshTokenPayload extends JWTPayload {
  userId: number;
  sessionId: number;
}

const accessSecret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_dev_secret_change_in_prod_32ch"
);
const refreshSecret = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret_change_32ch"
);

export async function signAccessToken(payload: Omit<AccessTokenPayload, keyof JWTPayload>) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES || "15m")
    .sign(accessSecret);
}

export async function signRefreshToken(payload: Omit<RefreshTokenPayload, keyof JWTPayload>) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES || "7d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}
