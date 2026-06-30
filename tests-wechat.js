"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { issueSession, verifySession } = require("./wechat/auth.js");
const { createStore } = require("./wechat/store.js");
const {
  buildNotificationJobs,
  enqueueJobs,
  processJobs,
} = require("./wechat/notifications.js");

const ROOT = __dirname;

function checkMiniappFiles() {
  const pages = ["workbench", "projects", "project-form", "settings", "bind"];
  const files = [
    "app.js",
    "app.json",
    "app.wxss",
    "config.js",
    "project.config.json",
    "sitemap.json",
    "utils/api.js",
    "utils/workflow.js",
    ...pages.flatMap((page) => [
      `pages/${page}/index.js`,
      `pages/${page}/index.json`,
      `pages/${page}/index.wxml`,
      `pages/${page}/index.wxss`,
    ]),
  ];
  files.forEach((file) => {
    assert.ok(fs.existsSync(path.join(ROOT, "miniapp", file)), `缺少小程序文件：${file}`);
  });

  const app = JSON.parse(fs.readFileSync(path.join(ROOT, "miniapp/app.json"), "utf8"));
  assert.equal(app.pages.length, pages.length);
  assert.equal(app.tabBar.list.length, 2);
}

async function checkCoreModules(tempDir) {
  const secret = "test-session-secret";
  const token = issueSession("user-1", secret, 60);
  assert.equal(verifySession(token, secret).sub, "user-1");
  assert.equal(verifySession(`${token}x`, secret), null);

  const store = createStore(path.join(tempDir, "unit-store.json"));
  store.write({
    schemaVersion: 1,
    users: {
      "user-1": {
        id: "user-1",
        oaOpenId: "oa-test-openid",
        preferences: { dueSoon: true, waiting: true, dailyPlan: false, dailyHour: 9 },
      },
    },
    states: {},
    bindTickets: {},
    notificationJobs: {},
  });

  const now = new Date("2026-06-29T08:00:00+08:00");
  const state = {
    activeProjectId: "project-1",
    projects: [
      {
        id: "project-1",
        name: "海报首版",
        status: "designing",
        dueDate: "2026-06-29",
      },
    ],
    tasks: [
      {
        id: "task-1",
        projectId: "project-1",
        title: "等待文案确认",
        nextAction: "确认最终标题",
        status: "waiting",
      },
    ],
  };

  const jobs = buildNotificationJobs(
    "user-1",
    state,
    { dueSoon: true, waiting: true, dailyPlan: false },
    now
  );
  assert.deepEqual(
    jobs.map((job) => job.kind).sort(),
    ["due-soon", "waiting"]
  );

  enqueueJobs(store, "user-1", state, store.read().users["user-1"].preferences, now);
  enqueueJobs(store, "user-1", state, store.read().users["user-1"].preferences, now);
  assert.equal(Object.keys(store.read().notificationJobs).length, 2, "相同提醒不应重复入队");

  let sent = 0;
  const results = await processJobs(
    store,
    {
      async sendTemplateMessage() {
        sent += 1;
        return { msgid: `msg-${sent}` };
      },
    },
    now
  );
  assert.equal(sent, 2);
  assert.ok(results.every((item) => item.status === "sent"));
  assert.ok(
    Object.values(store.read().notificationJobs).every((job) => job.status === "sent")
  );
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`测试服务提前退出：${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      // The process may still be binding its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("测试服务启动超时");
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json();
  return { response, body };
}

async function checkServerRoutes(tempDir) {
  const port = 18_000 + Math.floor(Math.random() * 2_000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const storeFile = path.join(tempDir, "server-store.json");
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      WECHAT_MINI_DEV_OPENID: "mini-test-openid",
      WECHAT_SESSION_SECRET: "server-test-session-secret",
      WECHAT_STORE_FILE: storeFile,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  try {
    await waitForServer(baseUrl, child);

    const homepage = await fetch(`${baseUrl}/`);
    assert.equal(homepage.status, 200);
    assert.match(await homepage.text(), /菁菁小画桌/);

    const health = await requestJson(baseUrl, "/api/health");
    assert.equal(health.response.status, 200);
    assert.equal(health.body.ok, true);

    const wechatHealth = await requestJson(baseUrl, "/api/wechat/health");
    assert.equal(wechatHealth.response.status, 200);
    assert.equal(wechatHealth.body.miniProgramConfigured, true);
    assert.equal(wechatHealth.body.serviceAccountConfigured, false);

    const login = await requestJson(baseUrl, "/api/wechat/mini/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "dev-code" }),
    });
    assert.equal(login.response.status, 200);
    assert.ok(login.body.token);
    const authHeaders = {
      Authorization: `Bearer ${login.body.token}`,
      "Content-Type": "application/json",
    };

    const stateResponse = await requestJson(baseUrl, "/api/wechat/state", {
      headers: authHeaders,
    });
    assert.equal(stateResponse.response.status, 200);
    assert.ok(stateResponse.body.state.projects.length > 0);

    const state = stateResponse.body.state;
    state.projects[0].name = "微信端回归项目";
    const saved = await requestJson(baseUrl, "/api/wechat/state", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ state }),
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.body.ok, true);

    const workflow = await requestJson(baseUrl, "/api/wechat/workflow", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        project: {
          id: "project-test",
          name: "活动海报",
          type: "海报",
          goal: "让用户一眼看懂活动时间和报名入口",
          deliverables: ["公众号长图"],
          requirements: "品牌绿色，周五前提交",
          dueDate: "2026-07-03",
        },
      }),
    });
    assert.equal(workflow.response.status, 200);
    assert.equal(workflow.body.workflow.ready, true);
    assert.ok(workflow.body.workflow.tasks.length > 0);

    const preferences = await requestJson(
      baseUrl,
      "/api/wechat/notifications/preferences",
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          preferences: { dueSoon: true, waiting: false, dailyPlan: true, dailyHour: 10 },
        }),
      }
    );
    assert.equal(preferences.response.status, 200);
    assert.equal(preferences.body.preferences.dailyHour, 10);

    const status = await requestJson(baseUrl, "/api/wechat/notifications/status", {
      headers: authHeaders,
    });
    assert.equal(status.response.status, 200);
    assert.equal(status.body.serviceAccountBound, false);

    const bind = await requestJson(baseUrl, "/api/wechat/notifications/bind-ticket", {
      method: "POST",
      headers: authHeaders,
      body: "{}",
    });
    assert.equal(bind.response.status, 503, "缺少服务号配置时应给出可理解的失败");
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
  }

  assert.equal(stderr, "");
}

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jingjing-wechat-"));
  try {
    checkMiniappFiles();
    await checkCoreModules(tempDir);
    await checkServerRoutes(tempDir);
    console.log("微信小程序与服务号测试通过");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
