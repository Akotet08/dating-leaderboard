import crypto from "node:crypto";
import { parse, serialize } from "cookie";
import { getFirstEnv } from "./_payment-config.js";

export const SESSION_COOKIE = "dating_leaderboard_session";

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt);
  return `scrypt$${salt}$${derivedKey}`;
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) {
    return false;
  }

  const [scheme, salt, storedKey] = passwordHash.split("$");
  if (scheme !== "scrypt" || !salt || !storedKey) {
    return false;
  }

  const candidateKey = await scrypt(password, salt);
  return timingSafeEqual(candidateKey, storedKey);
}

export function createSessionCookie(user) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      role: user.role,
      name: user.name,
      iat: Date.now()
    })
  ).toString("base64url");
  const signature = sign(payload);

  return serialize(SESSION_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSessionCookie() {
  return serialize(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function readSession(request) {
  const cookies = parse(request.headers.cookie ?? "");
  const value = cookies[SESSION_COOKIE];
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature || !timingSafeEqual(sign(payload), signature)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    pickupLine: user.pickup_line,
    hasLogin: user.has_login
  };
}

function sign(payload) {
  const secret = getFirstEnv(["SESSION_SECRET", "STRIPE_SECRET_KEY", "POSTGRES_URL"]);
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey.toString("base64url"));
      }
    });
  });
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
