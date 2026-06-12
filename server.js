const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4174);
const API_KEY = process.env.DASHSCOPE_API_KEY || "";
const MODEL = process.env.DASHSCOPE_MODEL || "qwen-plus";
const ROOT = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const publicFiles = new Set(["index.html", "styles.css", "app.js", "core.js"]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), { "Content-Type": "application/json; charset=utf-8" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, requested));
  const relative = path.relative(ROOT, filePath);
  const isPublicAsset = relative.startsWith(`assets${path.sep}`);
  const isPublicFile = publicFiles.has(relative);
  if (!filePath.startsWith(ROOT) || (!isPublicFile && !isPublicAsset)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const type = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    send(res, 200, data, { "Content-Type": type });
  });
}

function buildMessages(input) {
  const project = input.project || {};
  const recentMessages = Array.isArray(input.recentMessages) ? input.recentMessages.slice(-8) : [];
  const dashboard = input.dashboard || {};
  const projectWorkflowInstruction =
    input.intent === "project_workflow"
      ? [
          "这次输入来自「项目小纸条」表单，不是普通闲聊。",
          "你必须根据项目名称、类型、目标、交付物、截止时间来分析项目，并安排设计工作流。",
          "回复结构使用：项目判断、今日先做、后续步骤、需要确认、交付风险。",
          "不要要求用户重复已经在上下文里提供的信息；只追问仍然缺失的信息，例如尺寸、平台规格、确认人、交付格式。",
        ].join("\n")
      : "";
  const formatInstruction =
    input.intent === "project_workflow"
      ? "格式固定为：项目判断、今日先做、后续步骤、需要确认、交付风险。没有的项目可以省略。"
      : "格式固定为：已记录、设计动作、下一步、需要确认、交付风险。没有的项目可以省略。";
  const system = [
    "你是「菁菁小画桌」，简称「小画桌」，一位资深创意总监、平面设计导师和工作记录助理。",
    "使用者叫菁菁，是初级平面设计师。你的目标不是替她空泛评价，而是把需求、反馈、待办、风险、交付检查和作品集沉淀讲清楚。",
    "回答必须具体、温和、可执行。优先指出下一步动作、缺失信息、反馈转译和交付风险。",
    "如果用户输入的是反馈，先翻译成设计动作；如果是需求，先整理 brief；如果是进度，帮她更新复盘口径。",
    "不要编造已完成的文件或真实业务结果。没有信息时直接说需要补充什么。",
    "不要编造具体时刻、人员、确认结果、业务效果或文件名；除非用户明确给出。",
    "回复控制在 6-10 行，不使用 emoji，不使用 Markdown 表格。",
    formatInstruction,
    projectWorkflowInstruction,
  ].join("\n");
  const context = [
    `当前项目：${project.name || "未命名项目"}`,
    `项目类型：${project.type || "未知"}`,
    `目标：${project.goal || "待补充"}`,
    `受众：${project.audience || "待补充"}`,
    `场景：${project.scene || "待补充"}`,
    `交付物：${(project.deliverables || []).join("、") || "待补充"}`,
    `截止时间：${project.dueDate || "待补充"}`,
    `风险：${(project.risks || []).join("；") || "暂无"}`,
    `今日任务数：${dashboard.todayCount || 0}`,
    `等待确认数：${dashboard.waitingCount || 0}`,
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: `这是当前工作上下文：\n${context}` },
    ...recentMessages.map((message) => ({
      role: message.role === "agent" ? "assistant" : "user",
      content: String(message.text || "").slice(0, 1200),
    })),
    { role: "user", content: String(input.message || "").slice(0, 4000) },
  ];
}

function callQwen(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: buildMessages(payload),
      temperature: 0.25,
      max_tokens: 520,
    });
    const req = https.request(
      {
        hostname: "dashscope.aliyuncs.com",
        path: "/compatible-mode/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (error) {
            reject(new Error(`Qwen returned non-JSON response: ${data.slice(0, 200)}`));
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(parsed.error?.message || parsed.message || `Qwen request failed with ${res.statusCode}`));
            return;
          }
          resolve(sanitizeReply(parsed.choices?.[0]?.message?.content || "", payload.message || ""));
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sanitizeReply(reply, originalMessage) {
  const hasExplicitClock = /\d{1,2}[:：]\d{2}|\d{1,2}\s*[点时]/.test(originalMessage);
  if (hasExplicitClock) return reply;
  let replacement = "截止前";
  if (/明天下午|明日午后/.test(originalMessage)) replacement = "明天下午前";
  else if (/明天|明日/.test(originalMessage)) replacement = "明天内";
  else if (/今天|今日|下班前/.test(originalMessage)) replacement = "今天内";
  return reply
    .replace(/(?:今天|今日|明天|明日)?\s*\d{1,2}[:：]\d{2}\s*(?:前完成|前|截止)?/g, replacement)
    .replace(/今晚(?=明天|明日)/g, "")
    .replace(/今晚/g, replacement);
}

async function handleChat(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, {
      error: "DASHSCOPE_API_KEY is not set. Start the server with DASHSCOPE_API_KEY before using Qwen chat.",
    });
    return;
  }
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const reply = await callQwen(payload);
    sendJson(res, 200, { reply, model: MODEL });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Qwen request failed." });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }
  if (req.url.startsWith("/api/chat") && req.method === "POST") {
    handleChat(req, res);
    return;
  }
  if (req.url.startsWith("/api/health")) {
    sendJson(res, 200, { ok: true, model: MODEL, hasKey: Boolean(API_KEY) });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`菁菁小画桌 running at http://localhost:${PORT}`);
  console.log(`Qwen model: ${MODEL}${API_KEY ? "" : " (missing DASHSCOPE_API_KEY)"}`);
});
