"use strict";

function createWechatClient(config) {
  let oaTokenCache = null;

  async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const payload = await response.json();
      if (!response.ok || (payload.errcode && payload.errcode !== 0)) {
        const code = payload.errcode ? ` (${payload.errcode})` : "";
        throw new Error(`${payload.errmsg || `WeChat HTTP ${response.status}`}${code}`);
      }
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  async function code2Session(code) {
    if (config.miniDevOpenId) {
      return {
        openid: config.miniDevOpenId,
        unionid: "dev-union-id",
        session_key: "dev-session-key",
      };
    }
    if (!config.miniAppId || !config.miniAppSecret) {
      throw new Error("WeChat Mini Program credentials are not configured.");
    }
    const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
    url.searchParams.set("appid", config.miniAppId);
    url.searchParams.set("secret", config.miniAppSecret);
    url.searchParams.set("js_code", code);
    url.searchParams.set("grant_type", "authorization_code");
    return requestJson(url);
  }

  function buildOaAuthorizeUrl(ticket) {
    if (!config.oaAppId || !config.publicBaseUrl) {
      throw new Error("WeChat Official Account OAuth is not configured.");
    }
    const callback = `${config.publicBaseUrl}/wechat/oa/oauth/callback`;
    const url = new URL("https://open.weixin.qq.com/connect/oauth2/authorize");
    url.searchParams.set("appid", config.oaAppId);
    url.searchParams.set("redirect_uri", callback);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "snsapi_base");
    url.searchParams.set("state", ticket);
    return `${url.toString()}#wechat_redirect`;
  }

  async function exchangeOaCode(code) {
    if (!config.oaAppId || !config.oaAppSecret) {
      throw new Error("WeChat Official Account credentials are not configured.");
    }
    const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
    url.searchParams.set("appid", config.oaAppId);
    url.searchParams.set("secret", config.oaAppSecret);
    url.searchParams.set("code", code);
    url.searchParams.set("grant_type", "authorization_code");
    return requestJson(url);
  }

  async function getOaAccessToken() {
    if (oaTokenCache && oaTokenCache.expiresAt > Date.now() + 60_000) {
      return oaTokenCache.value;
    }
    if (!config.oaAppId || !config.oaAppSecret) {
      throw new Error("WeChat Official Account credentials are not configured.");
    }
    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", config.oaAppId);
    url.searchParams.set("secret", config.oaAppSecret);
    const payload = await requestJson(url);
    oaTokenCache = {
      value: payload.access_token,
      expiresAt: Date.now() + Number(payload.expires_in || 7200) * 1000,
    };
    return oaTokenCache.value;
  }

  async function sendTemplateMessage({ openId, projectId, title, time, action }) {
    if (!config.oaTemplateId) throw new Error("WECHAT_OA_TEMPLATE_ID is not configured.");
    const accessToken = await getOaAccessToken();
    const payload = {
      touser: openId,
      template_id: config.oaTemplateId,
      data: {
        [config.oaTemplateFields.title]: { value: String(title || "").slice(0, 20) },
        [config.oaTemplateFields.time]: { value: String(time || "").slice(0, 32) },
        [config.oaTemplateFields.action]: { value: String(action || "").slice(0, 40) },
      },
    };
    if (config.miniAppId) {
      payload.miniprogram = {
        appid: config.miniAppId,
        pagepath: `pages/workbench/index?projectId=${encodeURIComponent(projectId || "")}`,
      };
    }
    return requestJson(
      `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  }

  return {
    buildOaAuthorizeUrl,
    code2Session,
    exchangeOaCode,
    sendTemplateMessage,
  };
}

module.exports = { createWechatClient };
