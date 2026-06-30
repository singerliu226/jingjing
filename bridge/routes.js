"use strict";

function createContextBridgeRoutes({ bridge, sendJson, readBody, authorize }) {
  async function parseJson(req) {
    const raw = await readBody(req);
    try {
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      throw new Error("请求内容不是有效 JSON。");
    }
  }

  return async function route(req, res, requestUrl) {
    if (!requestUrl.pathname.startsWith("/api/context-bridge/")) return false;
    if (!authorize(req)) {
      sendJson(res, 401, { error: "未授权的 Context Bridge 请求。" });
      return true;
    }
    try {
      if (req.method === "GET" && requestUrl.pathname === "/api/context-bridge/status") {
        const snapshot = bridge.list({ limit: 1 });
        sendJson(res, 200, {
          ok: true,
          schemaVersion: "context-event-v1",
          paused: snapshot.paused,
          updatedAt: snapshot.updatedAt,
        });
        return true;
      }
      if (req.method === "GET" && requestUrl.pathname === "/api/context-bridge/events") {
        const result = bridge.list({
          projectId: requestUrl.searchParams.get("projectId") || "",
          status: requestUrl.searchParams.get("status") || "",
          limit: requestUrl.searchParams.get("limit") || 50,
        });
        sendJson(res, 200, { ok: true, ...result });
        return true;
      }
      if (req.method === "POST" && requestUrl.pathname === "/api/context-bridge/events") {
        const result = bridge.ingest(await parseJson(req));
        sendJson(res, result.accepted ? 201 : 200, { ok: true, ...result });
        return true;
      }
      const actionMatch = requestUrl.pathname.match(/^\/api\/context-bridge\/events\/([^/]+)\/action$/);
      if (req.method === "POST" && actionMatch) {
        const payload = await parseJson(req);
        const event = bridge.act(decodeURIComponent(actionMatch[1]), payload.action);
        if (!event) {
          sendJson(res, 404, { error: "没有找到这个候选版本。" });
          return true;
        }
        sendJson(res, 200, { ok: true, event });
        return true;
      }
      if (req.method === "POST" && requestUrl.pathname === "/api/context-bridge/control") {
        const payload = await parseJson(req);
        sendJson(res, 200, { ok: true, ...bridge.control(payload.action) });
        return true;
      }
      sendJson(res, 404, { error: "Context Bridge 接口不存在。" });
      return true;
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Context Bridge 请求处理失败。" });
      return true;
    }
  };
}

module.exports = { createContextBridgeRoutes };
