"use strict";

const Core = require("../core.js");
const {
  bearerToken,
  issueSession,
  randomTicket,
  userIdFromOpenId,
  verifySession,
} = require("./auth.js");
const {
  DEFAULT_PREFERENCES,
  enqueueJobs,
  normalizePreferences,
  processJobs,
} = require("./notifications.js");

function createWechatRoutes({ config, store, client, send, sendJson, readBody, callChat, callIntent }) {
  function getUser(req) {
    const session = verifySession(bearerToken(req), config.sessionSecret);
    if (!session) return null;
    return store.read().users[session.sub] || null;
  }

  function requireUser(req, res) {
    const user = getUser(req);
    if (!user) {
      sendJson(res, 401, { error: "小程序登录已失效，请重新打开小画桌。" });
      return null;
    }
    return user;
  }

  async function parseBody(req) {
    return JSON.parse((await readBody(req)) || "{}");
  }

  function safeState(value) {
    if (!value || typeof value !== "object") throw new Error("Invalid state.");
    const state = {
      ...value,
      projects: Array.isArray(value.projects) ? value.projects.slice(0, 100) : [],
      tasks: Array.isArray(value.tasks) ? value.tasks.slice(0, 500) : [],
      messages: Array.isArray(value.messages) ? value.messages.slice(-300) : [],
      feedback: Array.isArray(value.feedback) ? value.feedback.slice(-300) : [],
      checklist: Array.isArray(value.checklist) ? value.checklist.slice(-500) : [],
    };
    if (!state.projects.length) throw new Error("State must contain at least one project.");
    return state;
  }

  async function handleLogin(req, res) {
    try {
      const body = await parseBody(req);
      const session = await client.code2Session(String(body.code || ""));
      if (!session.openid) throw new Error("WeChat login did not return openid.");
      const userId = userIdFromOpenId(session.openid, config.sessionSecret);
      let user;
      store.mutate((data) => {
        const existing = data.users[userId] || {};
        user = {
          id: userId,
          miniOpenId: session.openid,
          unionId: session.unionid || existing.unionId || "",
          oaOpenId: existing.oaOpenId || "",
          preferences: normalizePreferences(existing.preferences),
          createdAt: existing.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.users[userId] = user;
        if (!data.states[userId]) data.states[userId] = Core.createSeedState(new Date());
      });
      sendJson(res, 200, {
        token: issueSession(userId, config.sessionSecret),
        user: {
          id: user.id,
          serviceAccountBound: Boolean(user.oaOpenId),
          preferences: user.preferences,
        },
      });
    } catch (error) {
      sendJson(res, 502, { error: `微信登录失败：${error.message}` });
    }
  }

  function handleGetState(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    const data = store.read();
    sendJson(res, 200, { state: data.states[user.id] || Core.createSeedState(new Date()) });
  }

  async function handlePutState(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    try {
      const body = await parseBody(req);
      const state = safeState(body.state);
      store.mutate((data) => {
        data.states[user.id] = state;
      });
      enqueueJobs(store, user.id, state, user.preferences, new Date());
      sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
    } catch (error) {
      sendJson(res, 400, { error: `项目同步失败：${error.message}` });
    }
  }

  async function handleWorkflow(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    try {
      const body = await parseBody(req);
      const source = body.project && typeof body.project === "object" ? body.project : {};
      const project = {
        ...source,
        name: String(source.name || "未命名设计项目"),
        type: String(source.type || "设计项目"),
        goal: String(source.goal || ""),
        dueDate: String(source.dueDate || ""),
        deliverables: Array.isArray(source.deliverables) ? source.deliverables : [],
        risks: Array.isArray(source.risks) ? source.risks : [],
      };
      const workflow = Core.generateProjectWorkflow(project, new Date());
      sendJson(res, 200, { workflow });
    } catch (error) {
      sendJson(res, 400, { error: `工作流生成失败：${error.message}` });
    }
  }

  async function handleChat(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    try {
      const payload = await parseBody(req);
      const result = await callChat(payload);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { error: error.message || "设计导师暂时不可用。" });
    }
  }

  async function handleIntent(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    try {
      const payload = await parseBody(req);
      const result = await callIntent(payload);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { error: error.message || "意图识别暂时不可用。" });
    }
  }

  function handleNotificationStatus(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    const jobs = Object.values(store.read().notificationJobs).filter((job) => job.userId === user.id);
    sendJson(res, 200, {
      serviceAccountBound: Boolean(user.oaOpenId),
      preferences: normalizePreferences(user.preferences),
      recent: jobs
        .sort((a, b) => String(b.sentAt || b.dueAt).localeCompare(String(a.sentAt || a.dueAt)))
        .slice(0, 10)
        .map(({ id, kind, status, dueAt, sentAt, lastError }) => ({
          id,
          kind,
          status,
          dueAt,
          sentAt: sentAt || "",
          lastError: lastError || "",
        })),
    });
  }

  async function handlePreferences(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    try {
      const body = await parseBody(req);
      const preferences = normalizePreferences(body.preferences);
      store.mutate((data) => {
        data.users[user.id].preferences = preferences;
        data.users[user.id].updatedAt = new Date().toISOString();
      });
      sendJson(res, 200, { preferences });
    } catch (error) {
      sendJson(res, 400, { error: `提醒设置保存失败：${error.message}` });
    }
  }

  function handleBindTicket(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    try {
      const ticket = randomTicket();
      store.mutate((data) => {
        data.bindTickets[ticket] = {
          userId: user.id,
          expiresAt: Date.now() + 10 * 60 * 1000,
          usedAt: null,
        };
      });
      sendJson(res, 200, {
        url: client.buildOaAuthorizeUrl(ticket),
        expiresIn: 600,
      });
    } catch (error) {
      sendJson(res, 503, { error: `服务号绑定暂不可用：${error.message}` });
    }
  }

  async function handleOauthCallback(url, res) {
    const code = url.searchParams.get("code") || "";
    const ticket = url.searchParams.get("state") || "";
    try {
      const data = store.read();
      const pending = data.bindTickets[ticket];
      if (!pending || pending.usedAt || pending.expiresAt < Date.now()) {
        throw new Error("绑定链接已失效，请返回小程序重新发起。");
      }
      const oauth = await client.exchangeOaCode(code);
      store.mutate((next) => {
        const current = next.bindTickets[ticket];
        if (!current || current.usedAt || current.expiresAt < Date.now()) {
          throw new Error("绑定链接已失效。");
        }
        next.users[current.userId].oaOpenId = oauth.openid;
        if (oauth.unionid) next.users[current.userId].unionId = oauth.unionid;
        next.users[current.userId].updatedAt = new Date().toISOString();
        current.usedAt = new Date().toISOString();
      });
      send(
        res,
        200,
        `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>绑定成功</title><body style="font-family:system-ui;padding:40px 24px;color:#14201d"><h1>服务号提醒已绑定</h1><p>现在可以返回菁菁小画桌，开启截止时间和等待确认提醒。</p></body></html>`,
        { "Content-Type": "text/html; charset=utf-8" }
      );
    } catch (error) {
      send(
        res,
        400,
        `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>绑定失败</title><body style="font-family:system-ui;padding:40px 24px"><h1>绑定没有完成</h1><p>${String(error.message || error).replace(/[<>&"]/g, "")}</p></body></html>`,
        { "Content-Type": "text/html; charset=utf-8" }
      );
    }
  }

  async function handleTestNotification(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    if (!user.oaOpenId) {
      sendJson(res, 409, { error: "请先绑定服务号，再发送测试提醒。" });
      return;
    }
    try {
      const data = store.read();
      const state = data.states[user.id] || {};
      const project =
        (state.projects || []).find((item) => item.id === state.activeProjectId) ||
        (state.projects || [])[0] ||
        {};
      const response = await client.sendTemplateMessage({
        openId: user.oaOpenId,
        projectId: project.id || "",
        title: "小画桌提醒测试",
        time: new Date().toLocaleString("zh-CN"),
        action: project.name ? `返回「${project.name}」查看下一步` : "返回小画桌查看项目",
      });
      sendJson(res, 200, { ok: true, msgId: response.msgid || "" });
    } catch (error) {
      sendJson(res, 502, { error: `测试提醒发送失败：${error.message}` });
    }
  }

  async function handleProcessNotifications(req, res) {
    const token = String(req.headers["x-wechat-admin-token"] || "");
    if (!config.adminToken || token !== config.adminToken) {
      sendJson(res, 401, { error: "通知任务执行未授权。" });
      return;
    }
    const data = store.read();
    Object.values(data.users).forEach((user) => {
      const state = data.states[user.id];
      if (state) enqueueJobs(store, user.id, state, user.preferences, new Date());
    });
    const results = await processJobs(store, client, new Date());
    sendJson(res, 200, { processed: results.length, results });
  }

  async function route(req, res, url) {
    const pathname = url.pathname;
    if (pathname === "/api/wechat/mini/login" && req.method === "POST") {
      await handleLogin(req, res);
      return true;
    }
    if (pathname === "/wechat/oa/oauth/callback" && req.method === "GET") {
      await handleOauthCallback(url, res);
      return true;
    }
    if (pathname === "/api/wechat/state" && req.method === "GET") {
      handleGetState(req, res);
      return true;
    }
    if (pathname === "/api/wechat/state" && req.method === "PUT") {
      await handlePutState(req, res);
      return true;
    }
    if (pathname === "/api/wechat/workflow" && req.method === "POST") {
      await handleWorkflow(req, res);
      return true;
    }
    if (pathname === "/api/wechat/chat" && req.method === "POST") {
      await handleChat(req, res);
      return true;
    }
    if (pathname === "/api/wechat/intent" && req.method === "POST") {
      await handleIntent(req, res);
      return true;
    }
    if (pathname === "/api/wechat/notifications/status" && req.method === "GET") {
      handleNotificationStatus(req, res);
      return true;
    }
    if (pathname === "/api/wechat/notifications/preferences" && req.method === "PUT") {
      await handlePreferences(req, res);
      return true;
    }
    if (pathname === "/api/wechat/notifications/bind-ticket" && req.method === "POST") {
      handleBindTicket(req, res);
      return true;
    }
    if (pathname === "/api/wechat/notifications/test" && req.method === "POST") {
      await handleTestNotification(req, res);
      return true;
    }
    if (pathname === "/api/wechat/notifications/process" && req.method === "POST") {
      await handleProcessNotifications(req, res);
      return true;
    }
    if (pathname === "/api/wechat/health" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        miniProgramConfigured: Boolean(
          config.miniDevOpenId || (config.miniAppId && config.miniAppSecret)
        ),
        serviceAccountConfigured: Boolean(
          config.oaAppId && config.oaAppSecret && config.oaTemplateId
        ),
        publicBaseUrlConfigured: Boolean(config.publicBaseUrl),
      });
      return true;
    }
    return false;
  }

  return { getUser, route };
}

module.exports = { createWechatRoutes, DEFAULT_PREFERENCES };
