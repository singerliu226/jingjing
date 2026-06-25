const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4174);
const API_KEY = process.env.DASHSCOPE_API_KEY || "";
const MODEL = process.env.DASHSCOPE_MODEL || "qwen-plus";
const VISION_MODEL = process.env.DASHSCOPE_VISION_MODEL || "qwen-vl-plus";
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 12_000_000);
const MAX_UPSTREAM_BYTES = Number(process.env.MAX_UPSTREAM_BYTES || 1_000_000);
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 25_000);
const API_TOKEN = process.env.DESIGN_DESK_API_TOKEN || "";
const ROOT = __dirname;
const DEFAULT_ALLOWED_ORIGINS = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, `http://[::1]:${PORT}`];
const ALLOWED_ORIGINS = (process.env.DESIGN_DESK_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const INTENT_BEHAVIORS = [
  "ask_plan",
  "ask_summary",
  "organize_meeting_notes",
  "decompose_brief",
  "plan_design_concepts",
  "plan_reference_research",
  "generate_image_prompt_brief",
  "ask_review",
  "ask_checklist",
  "ask_portfolio",
  "project_retrospective",
  "record_project_outcome",
  "generate_growth_profile",
  "explain_sanitized_error",
  "ask_confirmation_message",
  "request_missing_assets",
  "clarify_vague_feedback",
  "align_stakeholder_feedback",
  "synthesize_feedback_batch",
  "handle_scope_change",
  "answer_design_question",
  "audit_asset_license",
  "ask_design_directions",
  "compare_design_options",
  "triage_overload",
  "negotiate_deadline_scope",
  "report_progress_status",
  "estimate_design_workload",
  "prepare_feedback_request",
  "refine_copywriting",
  "optimize_action_path",
  "organize_information_hierarchy",
  "optimize_readability",
  "simulate_design_defense",
  "prepare_design_presentation",
  "handle_negative_feedback",
  "diagnose_ambiguous_issue",
  "integrate_composite_assets",
  "fix_asset_quality",
  "guide_design_software_operation",
  "negotiate_reference_similarity",
  "analyze_reference",
  "unify_series_visual_system",
  "organize_delivery_files",
  "prepare_design_handoff",
  "guide_print_prepress",
  "recommend_platform_specs",
  "adapt_multi_format",
  "check_brand_consistency",
  "optimize_logo_exposure",
  "optimize_alignment_spacing",
  "balance_visual_density",
  "separate_subject_background",
  "strengthen_visual_impact",
  "improve_visual_polish",
  "guide_visual_effect",
  "recommend_layout_structure",
  "recommend_typography_system",
  "recommend_color_system",
  "translate_style_keyword",
  "solve_design_issue",
  "cancel_task",
  "complete_checklist",
  "snooze_task",
  "summarize_version_changes",
  "clear_waiting",
  "mark_feedback_handled",
  "update_project_name",
  "update_project_type",
  "update_project_specs",
  "record_feedback",
  "create_project",
  "record_note",
  "record_version",
  "update_deadline",
  "update_brief",
  "update_deliverables",
  "complete_progress",
  "waiting_confirmation",
];

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
  const corsHeaders = res._corsOrigin
    ? {
        "Access-Control-Allow-Origin": res._corsOrigin,
        Vary: "Origin",
      }
    : {};
  res.writeHead(status, {
    "Access-Control-Allow-Headers": "content-type, authorization, x-design-desk-token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    ...corsHeaders,
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
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function prepareCors(req, res) {
  const origin = req.headers.origin || "";
  if (!origin) return true;
  if (!isAllowedOrigin(origin)) return false;
  res._corsOrigin = origin;
  return true;
}

function authorizeApiRequest(req) {
  if (!API_TOKEN) return true;
  const token = String(req.headers["x-design-desk-token"] || "");
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return token === API_TOKEN || bearer === API_TOKEN;
}

function sanitizeServerError(error, fallback) {
  const message = String((error && error.message) || "");
  if (/DASHSCOPE_API_KEY|API key|API Key|401|403|Unauthorized|Forbidden/i.test(message)) return "千问服务访问未授权或密钥未配置，请检查本地服务配置。";
  if (/timed out|timeout/i.test(message)) return "千问服务响应超时，请稍后再试。";
  if (/too large|response body/i.test(message)) return "千问服务返回内容过大，已停止处理。";
  if (/non-JSON|JSON/i.test(message)) return "千问服务返回格式异常，请稍后再试。";
  return fallback;
}

function isSensitiveErrorDisclosureRequest(message) {
  return (
    /(完整|原始|全部|详细).*(错误|报错|异常|日志|堆栈|stack|trace)|把.*(错误|报错|异常|日志|堆栈).*(给我|发我|贴出来)|show.*(full|raw).*(error|stack|log)/i.test(String(message || "")) &&
    /(千问|DashScope|dashscope|api|API|key|Key|密钥|token|Token|Authorization|Bearer|配额|额度|账号|区域|region|上游|服务|代理|server|服务器)/i.test(String(message || ""))
  );
}

function buildSanitizedErrorReply() {
  return [
    "核心判断：完整上游错误可能包含密钥、账号、配额或区域信息，不能原样展示。",
    "优先动作（下一步）：",
    "1. 只看脱敏后的错误类别：未配置、未授权、超时、额度/区域限制、返回格式异常。",
    "2. 检查服务是否通过本地入口打开，并确认环境变量和授权 token 已配置。",
    "3. 如果要排查，把密钥、授权头、账号 ID、区域信息和堆栈明细先打码。",
    "为什么：排查问题只需要错误类别和发生位置；原始错误会扩大泄露面。",
    "验收标准：发给别人前，文本里不出现密钥、授权头、账号、区域细节或堆栈明细。",
  ].join("\n");
}

function isFinalDeliveryCheckRequest(message) {
  return /准备发客户|发客户|最终检查|最后帮我看|最后看下|交付前|准备交付|终稿|定稿/.test(String(message || ""));
}

function buildFinalDeliveryBoundaryReply() {
  return [
    "核心判断：暂不建议直接发客户，因为目前缺少当前稿截图、客户验收标准和交付规格这三类证据。",
    "优先动作（下一步）：",
    "1. 先补当前稿截图或链接，确认主信息、可读性和错漏。",
    "2. 对照客户原始要求，核对尺寸、格式、文案终稿、版权和命名规范。",
    "3. 如果时间紧，只做交付风险修正，不临门重做风格方向。",
    "为什么：终稿检查的目标不是继续发散创意，而是降低客户验收风险。",
    "验收标准：截图、尺寸/格式、文案终稿、素材授权和导出文件都确认后，再发客户。",
  ].join("\n");
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

function buildMessages(input, attachments = []) {
  const project = input.project || {};
  const recentMessages = Array.isArray(input.recentMessages) ? input.recentMessages.slice(-8) : [];
  const dashboard = input.dashboard || {};
  const localReply = String(input.localReply || "").slice(0, 2000);
  const analysis = input.analysis && typeof input.analysis === "object" ? input.analysis : {};
  const imageAttachments = attachments.filter((attachment) => attachment.kind === "image");
  const textAttachments = attachments.filter((attachment) => attachment.kind === "text");
  const isDesignMentor = shouldUseDesignMentorContract(input, analysis, imageAttachments);
  const asksErrorDisclosure = analysis.behavior === "explain_sanitized_error" || isSensitiveErrorDisclosureRequest(input.message);
  const projectWorkflowInstruction =
    input.intent === "project_workflow"
      ? [
          "这次输入来自「项目详情」表单，不是普通闲聊。",
          "你必须根据项目名称、类型、核心要求、需求细节、交付物、截止时间和任务明细来分析项目，并安排设计工作流。",
          "回复结构使用：项目判断、今日先做、后续步骤、需要确认、交付风险。",
          "不要要求用户重复已经在上下文里提供的信息；只追问仍然缺失的信息，例如尺寸、平台规格、确认人、交付格式。",
        ].join("\n")
      : "";
  const formatInstruction =
    input.intent === "project_workflow"
      ? "格式固定为：项目判断、今日先做、后续步骤、需要确认、交付风险。没有的项目可以省略。"
      : isDesignMentor
        ? [
            "设计咨询必须用成长型 mentor 结构，不要写成整段说明书。",
            "格式固定为：核心判断、优先动作、为什么、验收标准。每个标题后直接写内容。",
            "用初级设计师能马上照做的话说，不要堆术语；少说“视觉层级重构、微质感、视觉锚点、材质语言”，多说“放大标题、删掉多余颜色、加一点留白、先用手机看 3 秒”。",
            "核心判断只写 1 句人话，直接告诉她现在最大问题是什么。",
            "优先动作最多 3 条，每条都用“动词 + 对象 + 怎么做”的句式，例如“把主标题放大一档”“把颜色收成黑白灰 + 1 个强调色”。",
            "为什么只解释最关键原因，不讲抽象理论。",
            "验收标准给 1 条用户改完后能自己检查的标准，最好能用 3 秒预览、手机预览、缩小截图这类方法。",
            "没有截图、Figma 节点、明确规格或用户给出的数值时，不要编造精确 px、色值、比例或“我看到”的视觉结论；尤其不要输出 24px、32px、#333 这类假精确参数；用范围、排查顺序和自查方法表达。",
            "可访问性建议不要说“WCAG AA 最小字号 14px”；优先提醒对比度、真实设备预览、系统字号缩放、触控目标和阅读距离。",
            "如果用户说“按你说的/上一轮/上版/再看看”，先写“上轮目标对照”，逐项复评上一轮目标是否改善，然后仍然必须写“核心判断”。",
            "如果用户说“准备发客户/最终检查/最后看下”，即使缺少截图或需求，也必须用固定结构回答；核心判断先明确“可以发/暂不建议发”，再列交付风险，不要只让用户补材料。",
            "不要输出“我已整理/我已同步/我记录到”，不要把内部过程甩给用户。",
          ].join("\n")
      : [
          "普通对话不要套固定栏目，回复保持 3-6 行。",
          "优先给菁菁一个清楚判断，再给 1-3 个下一步动作。",
          "只有确实缺信息或有交付风险时，才补一句需要确认/风险。",
          "不要重复本地已整理内容，不要写成模板清单。",
        ].join("\n");
  const system = [
    "你是「菁菁小画桌」，简称「小画桌」，一位资深创意总监、平面设计导师和工作记录助理。",
    "使用者叫菁菁，是初级平面设计师。你的目标不是替她空泛评价，而是把需求、反馈、待办、风险和交付检查讲清楚。",
    "回答必须具体、温和、可执行。优先指出下一步动作、缺失信息、反馈转译和交付风险。",
    "如果用户输入的是反馈，先翻译成设计动作；如果是需求，先整理 brief；如果是进度，帮她更新复盘口径。",
    "不要编造已完成的文件或真实业务结果。没有信息时直接说需要补充什么。",
    "不要编造具体时刻、人员、确认结果、业务效果或文件名；除非用户明确给出。",
    "如果用户要求查看完整错误、原始报错、堆栈、Authorization、Bearer、API Key、账号、配额或区域信息，只能给脱敏摘要和排查步骤，绝不输出原始敏感内容。",
    asksErrorDisclosure ? "这次用户在要求完整错误信息。直接拒绝原样展示，使用：核心判断、优先动作、为什么、验收标准；只给脱敏排查摘要。" : "",
    imageAttachments.length
      ? [
          "用户上传了设计图、参考图或截图。你要像资深平面设计师一样看图，不要只描述图片内容。",
          "图片回复优先使用「核心判断、优先动作、为什么、验收标准」结构；如果必须描述图面，只用“第一眼看到什么”补一句。",
          "每条建议必须落到版式层级、构图、字体、色彩、留白、视觉锚点、品牌一致性、可读性或交付风险，不要空泛说高级感/美观。",
        ].join("\n")
      : "",
    imageAttachments.length
      ? "回复控制在 8-12 行，不使用 emoji，不使用 Markdown 表格。"
      : input.intent === "project_workflow" ? "回复控制在 6-10 行，不使用 emoji，不使用 Markdown 表格。" : "回复短一点，像一位靠谱设计前辈在旁边提醒，不使用 emoji，不使用 Markdown 表格。",
    localReply ? "本地工作台已经先完成状态更新；你只补充更具体的判断、下一步和风险，不要重复声明“已记录/已更新”。" : "",
    formatInstruction,
    projectWorkflowInstruction,
  ].filter(Boolean).join("\n");
  const context = [
    `当前项目：${project.name || "未命名项目"}`,
    `项目类型：${project.type || "未知"}`,
    `核心要求：${project.goal || "待补充"}`,
    `需求细节：${project.requirements || "待补充"}`,
    `交付物：${(project.deliverables || []).join("、") || "待补充"}`,
    `截止时间：${project.dueDate || "待补充"}`,
    `当前进度：${project.progressNote || "待补充"}`,
    `项目任务：${formatProjectTasks(project.tasks)}`,
    `风险：${(project.risks || []).join("；") || "暂无"}`,
    `今日任务数：${dashboard.todayCount || 0}`,
    `等待确认数：${dashboard.waitingCount || 0}`,
  ].join("\n");
  const attachmentText = textAttachments.length
    ? `\n\n用户上传的文本文件：\n${textAttachments.map((item) => `【${item.name}】\n${item.text}`).join("\n\n")}`
    : "";
  const finalUserContent = buildUserContent(String(input.message || "").slice(0, 4000) + attachmentText, imageAttachments);
  return [
    { role: "system", content: system },
    { role: "user", content: `这是当前工作上下文：\n${context}` },
    ...(localReply ? [{ role: "user", content: `本地已整理结果：\n${localReply}` }] : []),
    ...recentMessages.map((message) => ({
      role: message.role === "agent" ? "assistant" : "user",
      content: String(message.text || "").slice(0, 1200),
    })),
    { role: "user", content: finalUserContent },
  ];
}

function shouldUseDesignMentorContract(input, analysis, imageAttachments) {
  if (imageAttachments.length) return true;
  const behavior = String(analysis.behavior || input.behavior || "").trim();
  if (behavior === "explain_sanitized_error") return true;
  const mentorBehaviors = new Set([
    "answer_design_question",
    "ask_design_directions",
    "optimize_readability",
    "recommend_color_system",
    "recommend_typography_system",
    "solve_design_issue",
    "guide_design_software_operation",
    "prepare_design_presentation",
    "simulate_design_defense",
    "ask_plan",
    "ask_summary",
    "ask_checklist",
    "ask_portfolio",
    "project_retrospective",
    "generate_growth_profile",
    "summarize_version_changes",
  ]);
  if (mentorBehaviors.has(behavior)) return true;
  return /高级感|不高级|怎么改|哪里乱|好看|丑|普通|质感|版式|字体|字号|配色|颜色|留白|层级|对齐|按钮|卡片|动效|交互|UI|UX|设计|老板说|客户说|复盘|成长/.test(
    String(input.message || "")
  );
}

function buildUserContent(text, imageAttachments) {
  if (!imageAttachments.length) return text;
  return [
    { type: "text", text },
    ...imageAttachments.map((attachment) => ({
      type: "image_url",
      image_url: { url: attachment.dataUrl },
    })),
  ];
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((attachment) => {
      const kind = attachment.kind === "text" ? "text" : attachment.kind === "image" ? "image" : "";
      const name = String(attachment.name || "未命名附件").slice(0, 80);
      const mimeType = String(attachment.mimeType || "").slice(0, 80);
      if (kind === "image") {
        const dataUrl = String(attachment.dataUrl || "");
        if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(dataUrl)) return null;
        return { kind, name, mimeType, dataUrl };
      }
      if (kind === "text") {
        return { kind, name, mimeType, text: String(attachment.text || "").slice(0, 12000) };
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, 4);
}

function formatProjectTasks(tasks) {
  if (!Array.isArray(tasks) || !tasks.length) return "暂无";
  return tasks
    .slice(0, 8)
    .map((task) => `${task.title || "未命名任务"}｜${task.status || "todo"}｜${task.dueDate || "未设截止"}｜${task.nextAction || "待补充"}`)
    .join("\n");
}

function buildIntentMessages(input) {
  const project = input.project || {};
  const recentMessages = Array.isArray(input.recentMessages) ? input.recentMessages.slice(-6) : [];
  const currentDate = normalizeDateInput(input.currentDate);
  const system = [
    "你是菁菁小画桌的意图识别器，只负责判断用户这句话的行为类型。",
    "只返回 JSON，不要 Markdown，不要解释，不要自然语言前后缀。",
    "JSON 结构：{\"schemaVersion\":\"llm-intent-v1\",\"intent\":\"行为名\",\"confidence\":0.0到1.0,\"summary\":\"一句话总结\",\"entities\":{},\"missing\":[],\"nextAction\":\"下一步\",\"reason\":\"一句中文理由\"}",
    "entities 可包含：projectName、projectType、source、dueDate(YYYY-MM-DD)、deliverables、goal、requirements、progressNote、audience、scene、specs、formats、status、feedback、tasks。",
    "feedback 结构：{\"raw\":\"原始反馈\",\"action\":\"可执行修改动作\",\"reason\":\"为什么要这样改\",\"conflict\":false}",
    "tasks 结构：[{\"title\":\"任务名\",\"dueDate\":\"YYYY-MM-DD或空\",\"status\":\"todo/designing/waiting/done\",\"priority\":\"high/normal\",\"nextAction\":\"下一步\"}]，最多 4 条。",
    `intent 必须从这个列表选择：${INTENT_BEHAVIORS.join(", ")}`,
    "判断原则：如果用户只是转述老板/客户/主管的要求且没有问怎么做，优先 record_feedback。",
    "如果用户在问怎么改、怎么检查、怎么讲、怎么安排，选择最具体的设计辅助行为。",
    "如果用户记录完成/等待/截止/交付物/项目信息，选择对应的工作记录行为。",
    "即使用户是在问“怎么做某个设计物料”，只要句子里出现了明确项目对象，也必须抽取 projectName、projectType、deliverables 和 requirements，方便前端回填项目详情。",
    "示例：用户说“怎么做酒吧海报”，intent 可为 ask_design_directions，但 entities 必须包含 {\"projectName\":\"酒吧海报\",\"projectType\":\"海报\",\"deliverables\":[\"海报\"],\"requirements\":\"用户想做酒吧海报；还需确认酒吧名称、投放位置、主信息和视觉调性。\"}。",
    `解析相对日期时，以 ${currentDate || "用户当前日期"} 为今天；例如“明天”是今天后一天，“下周一”按这个日期往后推到最近的下周一。`,
    "尽量抽取用户明确给出的实体；不要编造未给出的项目名、日期、交付物或反馈人。",
    "不确定时选择 record_note，confidence 不要超过 0.55。",
  ].join("\n");
  const context = [
    `当前项目：${project.name || "未命名项目"}`,
    `项目类型：${project.type || "未知"}`,
    `核心要求：${project.goal || "待补充"}`,
    `需求细节：${project.requirements || "待补充"}`,
    `交付物：${(project.deliverables || []).join("、") || "待补充"}`,
    `截止时间：${project.dueDate || "待补充"}`,
    `当前进度：${project.progressNote || "待补充"}`,
    `项目任务：${formatProjectTasks(project.tasks)}`,
    `今天日期：${currentDate || "未知"}`,
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: `当前工作上下文：\n${context}` },
    ...recentMessages.map((message) => ({
      role: message.role === "agent" ? "assistant" : "user",
      content: String(message.text || "").slice(0, 800),
    })),
    { role: "user", content: `请识别这句话的行为：${String(input.message || "").slice(0, 1600)}` },
  ];
}

function callDashScope(body, parseContent) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
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
        let bytes = 0;
        res.on("data", (chunk) => {
          if (settled) return;
          bytes += chunk.length;
          if (bytes > MAX_UPSTREAM_BYTES) {
            fail(new Error("Qwen response body too large."));
            res.destroy();
            req.destroy();
            return;
          }
          data += chunk;
        });
        res.on("end", () => {
          if (settled) return;
          settled = true;
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (error) {
            reject(new Error("Qwen returned non-JSON response."));
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Qwen request failed with ${res.statusCode}`));
            return;
          }
          try {
            resolve(parseContent(parsed.choices?.[0]?.message?.content || ""));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      fail(new Error("Qwen request timed out."));
      req.destroy();
    });
    req.on("error", fail);
    req.write(body);
    req.end();
  });
}

function callQwen(payload) {
  if (isSensitiveErrorDisclosureRequest(payload.message)) return Promise.resolve(buildSanitizedErrorReply());
  const attachments = normalizeAttachments(payload.attachments);
  if (!attachments.some((attachment) => attachment.kind === "image") && isFinalDeliveryCheckRequest(payload.message)) {
    return Promise.resolve(buildFinalDeliveryBoundaryReply());
  }
  const hasImage = attachments.some((attachment) => attachment.kind === "image");
  const body = JSON.stringify({
    model: hasImage ? VISION_MODEL : MODEL,
    messages: buildMessages(payload, attachments),
    temperature: 0.25,
    max_tokens: hasImage ? 900 : 520,
  });
  return callDashScope(body, (content) => sanitizeReply(content, payload.message || ""));
}

function callQwenIntent(payload) {
  const body = JSON.stringify({
    model: MODEL,
    messages: buildIntentMessages(payload),
    temperature: 0.05,
    max_tokens: 360,
  });
  return callDashScope(body, (content) => normalizeIntent(parseJsonObject(content)));
}

function parseJsonObject(text) {
  const clean = String(text || "").trim();
  try {
    return JSON.parse(clean);
  } catch (error) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Qwen intent response did not include JSON.");
    return JSON.parse(match[0]);
  }
}

function normalizeDateInput(value) {
  const text = String(value || "").trim();
  return /^20\d{2}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeIntent(intent) {
  const behavior = String(intent.intent || intent.behavior || "").trim();
  if (!INTENT_BEHAVIORS.includes(behavior)) {
    return {
      schemaVersion: "llm-intent-v1",
      intent: "record_note",
      behavior: "record_note",
      confidence: 0.4,
      summary: "",
      entities: {},
      missing: [],
      nextAction: "",
      reason: "模型返回了未知行为，已降级为普通记录。",
    };
  }
  const confidence = Number(intent.confidence);
  const missing = Array.isArray(intent.missing) ? intent.missing.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
  return {
    schemaVersion: "llm-intent-v1",
    intent: behavior,
    behavior,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.65,
    summary: String(intent.summary || "").slice(0, 180),
    entities: intent.entities && typeof intent.entities === "object" ? intent.entities : {},
    missing,
    nextAction: String(intent.nextAction || "").slice(0, 180),
    reason: String(intent.reason || "").slice(0, 160),
  };
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
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    if (isSensitiveErrorDisclosureRequest(payload.message)) {
      sendJson(res, 200, { reply: buildSanitizedErrorReply(), model: "local-safety" });
      return;
    }
    if (!API_KEY) {
      sendJson(res, 500, { error: "千问服务访问密钥未配置，请检查本地服务启动配置。" });
      return;
    }
    const reply = await callQwen(payload);
    const attachments = normalizeAttachments(payload.attachments);
    const hasImage = attachments.some((attachment) => attachment.kind === "image");
    sendJson(res, 200, { reply, model: hasImage ? VISION_MODEL : MODEL });
  } catch (error) {
    sendJson(res, 500, { error: sanitizeServerError(error, "千问对话服务暂时不可用，请稍后再试。") });
  }
}

async function handleIntent(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, { error: "千问意图识别访问密钥未配置，请检查本地服务启动配置。" });
    return;
  }
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const intent = await callQwenIntent(payload);
    sendJson(res, 200, { intent, model: MODEL });
  } catch (error) {
    sendJson(res, 500, { error: sanitizeServerError(error, "千问意图识别暂时不可用，请稍后再试。") });
  }
}

const server = http.createServer((req, res) => {
  const isProtectedApi = req.url.startsWith("/api/chat") || req.url.startsWith("/api/intent");
  if (!prepareCors(req, res)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }
  if (isProtectedApi && !authorizeApiRequest(req)) {
    sendJson(res, 401, { error: "未授权的本地代理请求。" });
    return;
  }
  if (req.url.startsWith("/api/chat") && req.method === "POST") {
    handleChat(req, res);
    return;
  }
  if (req.url.startsWith("/api/intent") && req.method === "POST") {
    handleIntent(req, res);
    return;
  }
  if (req.url.startsWith("/api/health")) {
    sendJson(res, 200, { ok: true, model: MODEL, visionModel: VISION_MODEL, hasKey: Boolean(API_KEY) });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`菁菁小画桌 running at http://localhost:${PORT}`);
  console.log(`Qwen model: ${MODEL}${API_KEY ? "" : " (missing DASHSCOPE_API_KEY)"}`);
  console.log(`Qwen vision model: ${VISION_MODEL}`);
});
