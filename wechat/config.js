"use strict";

const path = require("node:path");

function readJsonEnv(name, fallback = {}) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${name} must be valid JSON.`);
  }
}

function loadWechatConfig(rootDir) {
  const publicBaseUrl = String(process.env.WECHAT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  return {
    miniAppId: String(process.env.WECHAT_MINI_APP_ID || ""),
    miniAppSecret: String(process.env.WECHAT_MINI_APP_SECRET || ""),
    miniDevOpenId: String(process.env.WECHAT_MINI_DEV_OPENID || ""),
    oaAppId: String(process.env.WECHAT_OA_APP_ID || ""),
    oaAppSecret: String(process.env.WECHAT_OA_APP_SECRET || ""),
    oaTemplateId: String(process.env.WECHAT_OA_TEMPLATE_ID || ""),
    oaTemplateFields: {
      title: "thing1",
      time: "time2",
      action: "thing3",
      ...readJsonEnv("WECHAT_OA_TEMPLATE_FIELDS"),
    },
    publicBaseUrl,
    sessionSecret: String(process.env.WECHAT_SESSION_SECRET || "local-wechat-session-secret-change-me"),
    adminToken: String(process.env.WECHAT_NOTIFICATION_ADMIN_TOKEN || ""),
    storeFile: path.resolve(
      process.env.WECHAT_STORE_FILE || path.join(rootDir, "data", "wechat-store.json")
    ),
    requestTimeoutMs: Number(process.env.WECHAT_REQUEST_TIMEOUT_MS || 12_000),
  };
}

module.exports = { loadWechatConfig };
