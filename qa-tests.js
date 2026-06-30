const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const Core = require("./core.js");

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:4174";
const fixedNow = new Date("2026-06-24T10:00:00+08:00");

const results = [];

function record(name, fn) {
  results.push(
    Promise.resolve()
      .then(fn)
      .then(() => ({ name, status: "pass" }))
      .catch((error) => ({ name, status: "fail", error: error.message || String(error) }))
  );
}

function recordLive(name, fn) {
  results.push(
    Promise.resolve()
      .then(fn)
      .then((detail) => ({ name, status: "pass", detail }))
      .catch((error) => {
        if (error && error.skip) return { name, status: "skip", detail: error.message };
        return { name, status: "fail", error: error.message || String(error) };
      })
  );
}

function skip(message) {
  const error = new Error(message);
  error.skip = true;
  throw error;
}

function freshState() {
  return Core.createSeedState(fixedNow);
}

function applyInput(state, text, options = {}) {
  return Core.applyInput(state, text, fixedNow, { localMode: "guardrail", ...options });
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

async function fetchJson(path, options) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch (error) {
    skip(`本地服务不可用：${error.message}`);
  }
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`接口没有返回 JSON：HTTP ${response.status}`);
  }
  if (!response.ok) {
    if (/密钥未配置|访问密钥未配置/.test(payload.error || "")) skip("本地服务未配置千问访问密钥。");
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function makeRedPngDataUrl() {
  return [
    "data:image/png;base64,",
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAgUlEQVR4nNXOMREAIBDAsFJxzPhXgQRE/MA1CrLu2ZRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJnMRJfMHAQKcATr8i7SkAAAAAElFTkSuQmCC",
  ].join("");
}

record("首屏信息架构：左项目、中对话、右项目详情", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("styles.css");
  assert.ok(html.includes("id=\"project-list\""));
  assert.ok(html.includes("aria-label=\"和小画桌对话\""));
  assert.ok(html.includes("aria-label=\"项目详情\""));
  assert.ok(html.includes("id=\"service-gate\""));
  assert.ok(html.includes("id=\"detail-toggle\""));
  assert.ok(html.includes("id=\"detail-close-button\""));
  assert.ok(html.includes("id=\"detail-fab\""));
  assert.ok(html.includes("id=\"rail-backdrop\""));
  assert.ok(app.includes("guardServiceEntry"));
  assert.ok(app.includes("openProjectDetail"));
  assert.ok(app.includes("closeProjectDetail"));
  assert.ok(css.includes("body.detail-open .work-rail"));
  assert.ok(css.includes("grid-template-columns: minmax(0, 1fr) auto"));
  assert.ok(css.includes(".project-list::-webkit-scrollbar"));
  assert.ok(!html.includes("日报"));
  assert.ok(!html.includes("知识库"));
});

record("对话输入：支持回车发送、提示词、上传入口", () => {
  const html = read("index.html");
  const app = read("app.js");
  assert.ok(html.includes("id=\"message-input\""));
  assert.ok(html.includes("id=\"prompt-strip\""));
  assert.ok(app.includes("className: \"prompt-chip\""));
  assert.ok(html.includes("id=\"attachment-input\""));
  assert.ok(html.includes("accept=\"image/*,.txt,.md,.csv,.json\""));
  assert.ok(app.includes("event.key === \"Enter\" && !event.shiftKey"));
  assert.ok(app.includes("handleAttachmentFiles"));
});

record("成长闭环：快捷入口覆盖首版、复评、交付判断和单项练习", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("styles.css");
  assert.ok(html.includes("id=\"prompt-strip\""));
  assert.ok(app.includes("buildFirstReviewPrompt"));
  assert.ok(app.includes("buildRevisionPrompt"));
  assert.ok(app.includes("上轮目标对照"));
  assert.ok(app.includes("只给我一个本周练习"));
  assert.ok(app.includes("先明确判断这个版本现在能不能发给客户"));
  assert.ok(css.includes(".answer-practice"));
  assert.ok(css.includes(".answer-verdict"));
});

record("移动端：项目切换、评审动作、底部导航和详情入口完整", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("styles.css");
  [
    "mobile-app-header",
    "mobile-project-switch",
    "mobile-detail-button",
    "mobile-review-actions",
    "mobile-bottom-nav",
    "mobile-project-sheet",
    "mobile-project-list",
  ].forEach((token) => assert.ok(html.includes(token), `${token} missing`));
  assert.ok(app.includes("renderMobileProjects"));
  assert.ok(app.includes("openMobileProjectSheet"));
  assert.ok(app.includes("runMobileReviewAction"));
  assert.ok(app.includes("renderMobileStageGuide"));
  assert.ok(app.includes("finishProjectDetails"));
  assert.ok(css.includes("height: 100dvh"));
  assert.ok(css.includes(".mobile-project-row"));
  assert.ok(css.includes(".mobile-bottom-nav"));
  assert.ok(css.includes(".mobile-stage-guide"));
});

record("项目详情：可编辑、可自动回填、可删除", () => {
  const html = read("index.html");
  const app = read("app.js");
  ["project-name-input", "project-due-input", "project-status-input", "project-deliverables-input", "project-requirements-input", "project-progress-input"].forEach((id) => {
    assert.ok(html.includes(`id=\"${id}\"`), `${id} missing`);
  });
  assert.ok(app.includes("applyProjectAutofill"));
  assert.ok(app.includes("deleteActiveProject"));
  assert.ok(html.includes("删除这个项目"));
});

record("附件安全：图片预览不把 base64 长期写进状态", () => {
  const app = read("app.js");
  assert.ok(app.includes("transientAttachmentPreviews"));
  assert.ok(app.includes("dataUrl: attachment.kind === \"image\" ? attachment.dataUrl : \"\""));
  assert.ok(app.includes("message.attachments = attachments.map"));
  assert.ok(app.includes("text: kind === \"text\" ? text : \"\""));
});

record("代理安全：限制来源、可选 token、超时和响应体上限", () => {
  const server = read("server.js");
  const app = read("app.js");
  const css = read("styles.css");
  assert.ok(!server.includes("\"Access-Control-Allow-Origin\": \"*\""));
  assert.ok(server.includes("DESIGN_DESK_ALLOWED_ORIGINS"));
  assert.ok(server.includes("DESIGN_DESK_API_TOKEN"));
  assert.ok(server.includes("UPSTREAM_TIMEOUT_MS"));
  assert.ok(server.includes("MAX_UPSTREAM_BYTES"));
  assert.ok(server.includes("sanitizeServerError"));
  assert.ok(app.includes("fetchJsonWithTimeout"));
  assert.ok(app.includes("shell.inert = true"));
  assert.ok(css.includes(".service-entry-required .app-shell"));
});

record("服务端：有图片时切视觉模型，无图片时保留文本模型", () => {
  const server = read("server.js");
  assert.ok(server.includes("VISION_MODEL"));
  assert.ok(server.includes("hasImage ? VISION_MODEL : MODEL"));
  assert.ok(server.includes("image_url"));
  assert.ok(server.includes("成长型 mentor 结构"));
  assert.ok(server.includes("核心判断、优先动作、为什么、验收标准"));
  assert.ok(server.includes("第一眼看到什么"));
  assert.ok(server.includes("版式层级、构图、字体、色彩、留白"));
});

record("对话回填：兜底内容要像项目小结，不暴露机器拼接", () => {
  const app = read("app.js");
  assert.ok(app.includes("菁菁想做"));
  assert.ok(app.includes("还需要确认："));
  assert.ok(!app.includes("从对话提取："));
});

record("核心记录：新项目、交付物、截止时间能被整理", () => {
  const state = freshState();
  const before = state.projects.length;
  applyInput(state, "新项目「夏日酒吧」客户要海报和小红书封面，明天交。");
  assert.equal(state.projects.length, before + 1);
  const project = state.projects[0];
  assert.equal(project.name, "夏日酒吧");
  assert.ok(project.deliverables.includes("海报"));
  assert.ok(project.deliverables.includes("小红书封面"));
  assert.equal(project.dueDate, "2026-06-25");
});

record("核心记录：反馈能转成待办和风险", () => {
  const state = freshState();
  applyInput(state, "主管说海报太暗，要更年轻一点，明天下午前改。");
  const feedback = state.feedback.at(-1);
  assert.equal(feedback.from, "主管");
  assert.ok(feedback.action.includes("提高整体明度"));
  assert.ok(state.tasks.some((task) => task.title.includes("处理反馈")));
});

record("核心咨询：设计问题不应被误当作项目记录", () => {
  const state = freshState();
  const beforeTasks = state.tasks.length;
  const result = applyInput(state, "标题字体怎么配比较好？");
  assert.ok(["recommend_typography_system", "answer_design_question"].includes(result.analysis.behavior));
  assert.equal(state.tasks.length, beforeTasks);
  assert.ok(result.reply.includes("字体") || result.reply.includes("设计"));
});

record("模型实体：requirements/progressNote 可进入项目上下文", () => {
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  applyInput(state, "这个项目继续推进。", {
    intent: {
      schemaVersion: "llm-intent-v1",
      intent: "record_note",
      confidence: 0.9,
      entities: {
        requirements: "酒吧海报需要突出活动主题、品牌调性和到店引导。",
        progressNote: "已确认要先做主视觉草稿。",
      },
    },
  });
  assert.ok(project.requirements.includes("酒吧海报"));
  assert.ok(project.progressNote.includes("主视觉草稿"));
});

record("工作流：项目详情完整后能生成下一步任务", () => {
  const state = freshState();
  const project = Core.getProject(state, state.activeProjectId);
  project.name = "酒吧开业海报";
  project.type = "海报";
  project.goal = "让附近用户知道开业活动并到店。";
  project.deliverables = ["海报", "小红书封面"];
  project.dueDate = "2026-06-25";
  const workflow = Core.generateProjectWorkflow(project, fixedNow);
  assert.equal(workflow.ready, true);
  assert.ok(workflow.tasks.some((task) => task.key === "draft"));
});

recordLive("接口健康：/api/health 返回文本和视觉模型状态", async () => {
  const health = await fetchJson("/api/health");
  assert.equal(health.ok, true);
  assert.ok(health.model);
  assert.ok(health.visionModel);
  return `${health.model} / ${health.visionModel}`;
});

recordLive("真实意图识别：酒吧海报问题应返回可回填字段", async () => {
  const payload = await fetchJson("/api/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "怎么做酒吧海报",
      currentDate: "2026-06-24",
      project: { name: "第一个设计项目", type: "设计项目", deliverables: [], tasks: [] },
      dashboard: {},
      recentMessages: [],
    }),
  });
  assert.ok(payload.intent.entities.projectName || payload.intent.entities.projectType);
  assert.ok((payload.intent.entities.deliverables || []).length);
  return payload.intent.intent;
});

recordLive("真实文本对话：普通设计问题返回可执行建议", async () => {
  const payload = await fetchJson("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "老板说画面不够高级，我应该先改哪里？",
      project: { name: "酒吧海报", type: "海报", deliverables: ["海报"], tasks: [] },
      dashboard: {},
      recentMessages: [],
    }),
  });
  assert.ok(payload.reply.length > 20);
  assert.equal(payload.model, "qwen-plus");
  return payload.reply.slice(0, 40).replace(/\s+/g, " ");
});

recordLive("真实图片对话：上传图片时切到视觉模型", async () => {
  const payload = await fetchJson("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "请看这张测试图，指出一个设计观察。",
      project: { name: "图片测试", type: "海报", deliverables: ["海报"], tasks: [] },
      dashboard: {},
      recentMessages: [],
      attachments: [{ kind: "image", name: "red.png", mimeType: "image/png", dataUrl: makeRedPngDataUrl() }],
    }),
  });
  assert.equal(payload.model, "qwen-vl-plus");
  assert.ok(payload.reply.length > 10);
  assert.ok(payload.reply.includes("核心判断") || payload.reply.includes("第一眼"));
  return payload.reply.slice(0, 40).replace(/\s+/g, " ");
});

(async () => {
  const settled = await Promise.all(results);
  const pass = settled.filter((item) => item.status === "pass");
  const skipItems = settled.filter((item) => item.status === "skip");
  const fail = settled.filter((item) => item.status === "fail");

  console.log("\nQA Evaluation Results");
  console.log("=====================");
  settled.forEach((item) => {
    const suffix = item.detail ? ` - ${item.detail}` : item.error ? ` - ${item.error}` : "";
    console.log(`${item.status.toUpperCase().padEnd(4)} ${item.name}${suffix}`);
  });
  console.log(`\nSummary: ${pass.length} passed, ${skipItems.length} skipped, ${fail.length} failed.`);

  if (fail.length) process.exit(1);
})();
