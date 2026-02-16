import type { HttpRequest } from "@azure/functions";
import jwt, { type JwtHeader, type JwtPayload, type SigningKeyCallback } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { HttpError } from "../http/errors.js";
import { enforceRateLimit } from "./rate-limit.js";

export interface AuthContext {
  userId: string;
  email?: string;
  name?: string;
}

const jwtSecret = process.env.API_JWT_SECRET ?? "";

let jwksClient: jwksRsa.JwksClient | undefined;

function getJwksClient(): jwksRsa.JwksClient | undefined {
  if (jwksClient) return jwksClient;
  const jwksUri = process.env.B2C_JWKS_URI;
  const issuer = process.env.B2C_ISSUER;
  if (!jwksUri || !issuer) return undefined;
  jwksClient = jwksRsa({
    jwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 10 * 60 * 1000,
    rateLimit: true,
    jwksRequestsPerMinute: 10
  });
  return jwksClient;
}

function verifyHS256(token: string): JwtPayload {
  const decoded = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
  if (!decoded || typeof decoded === "string") {
    throw new HttpError(401, "AUTH_REQUIRED", "Invalid token payload");
  }
  return decoded as JwtPayload;
}

function verifyRS256(token: string): Promise<JwtPayload> {
  const client = getJwksClient();
  if (!client) throw new HttpError(401, "AUTH_REQUIRED", "B2C JWKS not configured");
  const issuer = process.env.B2C_ISSUER!;
  const audience = process.env.B2C_AUDIENCE!;

  function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
    if (!header.kid) { callback(new Error("Missing kid header")); return; }
    client!.getSigningKey(header.kid, (error, key) => {
      if (error) { callback(error); return; }
      callback(null, key?.getPublicKey());
    });
  }

  return new Promise<JwtPayload>((resolve, reject) => {
    jwt.verify(token, getSigningKey, { algorithms: ["RS256"], audience, issuer }, (error, decoded) => {
      if (error) { reject(new HttpError(401, "AUTH_EXPIRED", error.message)); return; }
      if (!decoded || typeof decoded === "string") {
        reject(new HttpError(401, "AUTH_REQUIRED", "Invalid token payload"));
        return;
      }
      resolve(decoded as JwtPayload);
    });
  });
}

export async function requireAuth(request: HttpRequest): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "AUTH_REQUIRED", "Missing bearer token");
  }

  const token = authHeader.slice("Bearer ".length).trim();

  let payload: JwtPayload;

  // Try HS256 first (from web proxy), fall back to RS256 (B2C legacy/CLI)
  if (jwtSecret) {
    try {
      payload = verifyHS256(token);
    } catch {
      payload = await verifyRS256(token);
    }
  } else {
    payload = await verifyRS256(token);
  }

  if (!payload.sub) {
    throw new HttpError(401, "AUTH_REQUIRED", "Token missing sub claim");
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : undefined;
  const canonicalUserId = email && email.length > 0 ? email : payload.sub;

  await enforceRateLimit(canonicalUserId, "api");

  return {
    userId: canonicalUserId,
    email,
    name: typeof payload.name === "string" ? payload.name : undefined
  };
}
