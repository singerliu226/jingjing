"use strict";

const crypto = require("node:crypto");

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function issueSession(userId, secret, ttlSeconds = 30 * 24 * 60 * 60) {
  const payload = base64url(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    })
  );
  return `${payload}.${sign(payload, secret)}`;
}

function verifySession(token, secret) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.sub || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function bearerToken(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function userIdFromOpenId(openId, secret) {
  return crypto.createHmac("sha256", secret).update(openId).digest("hex").slice(0, 24);
}

function randomTicket() {
  return crypto.randomBytes(24).toString("base64url");
}

module.exports = {
  bearerToken,
  issueSession,
  randomTicket,
  userIdFromOpenId,
  verifySession,
};
