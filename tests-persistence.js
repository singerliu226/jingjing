"use strict";

// F4 持久化护栏测试（独立运行，不进 npm test，避免与并行改动冲突）：
//   node tests-persistence.js
// 只通过 Core 的公开 API（loadState/saveState/createSeedState/applyInput）验证行为。

const assert = require("node:assert/strict");
const Core = require("./core.js");

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log("  ok -", name);
}

// 内存版 storage（无上限）
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

// 配额受限 storage：单值超过 limit 字节即抛 QuotaExceededError
function makeQuotaStorage(limit) {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      const s = String(v);
      if (s.length > limit) {
        const err = new Error("quota exceeded");
        err.name = "QuotaExceededError";
        throw err;
      }
      map.set(k, s);
    },
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

function seedWithMessages(count) {
  const state = Core.createSeedState(new Date("2026-06-25T00:00:00Z"));
  state.messages = [];
  for (let i = 0; i < count; i += 1) {
    state.messages.push({
      id: `m-${i}`,
      role: i % 2 === 0 ? "user" : "agent",
      projectId: "p-first",
      createdAt: new Date("2026-06-25T00:00:00Z").toISOString(),
      text: `消息 ${i}`,
    });
  }
  return state;
}

console.log("F4 persistence guardrails:");

test("loadState(null) 返回可用种子（含项目）", () => {
  const state = Core.loadState(null);
  assert.ok(Array.isArray(state.projects) && state.projects.length > 0);
  assert.equal(state.activeProjectId, state.projects[0].id);
});

test("saveState→loadState 往返保真（正常规模）", () => {
  const storage = makeStorage();
  const state = seedWithMessages(5);
  assert.equal(Core.saveState(storage, state), true);
  const back = Core.loadState(storage);
  assert.equal(back.messages.length, 5);
  assert.equal(back.messages[4].text, "消息 4");
  assert.equal(back.projects[0].id, "p-first");
});

test("损坏的 JSON 不抛错、回退种子", () => {
  const storage = makeStorage();
  storage.setItem(Core.STORAGE_KEY, "{not valid json");
  const state = Core.loadState(storage);
  assert.ok(state.projects.length > 0);
  assert.equal(state.activeProjectId, state.projects[0].id);
});

test("残缺 state 被迁移补齐：缺失数组字段不再导致下游报错", () => {
  const storage = makeStorage();
  // 旧/被篡改数据：project 缺 risks/versions/portfolio/deliverables，顶层缺 tasks/feedback/checklist
  storage.setItem(
    Core.STORAGE_KEY,
    JSON.stringify({
      activeProjectId: "p-x",
      messages: [{ id: "m1", role: "agent", projectId: "p-x", text: "hi" }],
      projects: [{ id: "p-x", name: "残缺项目" }],
    })
  );
  const state = Core.loadState(storage);
  const project = state.projects[0];
  assert.ok(Array.isArray(project.risks));
  assert.ok(Array.isArray(project.versions));
  assert.ok(Array.isArray(project.deliverables));
  assert.equal(typeof project.portfolio.process, "string");
  assert.ok(Array.isArray(state.tasks));
  assert.ok(Array.isArray(state.feedback));
  assert.ok(Array.isArray(state.checklist));
  assert.equal(state.activeProjectId, "p-x");
  // 迁移后的 state 应能被 applyInput 安全消费（访问 project.versions/risks 等不抛错）
  assert.doesNotThrow(() => Core.applyInput(state, "今天要做什么", new Date("2026-06-25T00:00:00Z")));
});

test("projects 为空的 state 视为不可用，回退种子", () => {
  const storage = makeStorage();
  storage.setItem(Core.STORAGE_KEY, JSON.stringify({ projects: [], messages: [] }));
  const state = Core.loadState(storage);
  assert.ok(state.projects.length > 0);
});

test("messages 超上限时持久化被截到最近 200 条，且保留最新", () => {
  const storage = makeStorage();
  const state = seedWithMessages(300);
  Core.saveState(storage, state);
  const back = Core.loadState(storage);
  assert.ok(back.messages.length <= 200, `期望 <=200，实际 ${back.messages.length}`);
  // 最新一条必须保留（最旧的被丢弃）
  assert.equal(back.messages[back.messages.length - 1].text, "消息 299");
  assert.ok(!back.messages.some((m) => m.text === "消息 0"));
});

test("内存 state 不被 saveState 改写（裁剪只作用于持久化副本）", () => {
  const storage = makeStorage();
  const state = seedWithMessages(300);
  Core.saveState(storage, state);
  assert.equal(state.messages.length, 300, "saveState 不应修改传入的内存 state");
});

test("配额超限：逐级裁剪后成功写入、绝不抛出、最新消息仍在", () => {
  const state = seedWithMessages(300);
  // 限到只能放下约 60 条的体量，迫使走 QUOTA_FALLBACK 链
  const approxOne = JSON.stringify(state.messages[0]).length;
  const storage = makeQuotaStorage(approxOne * 80 + 2000);
  let ok;
  assert.doesNotThrow(() => {
    ok = Core.saveState(storage, state);
  });
  assert.equal(ok, true);
  const back = Core.loadState(storage);
  assert.ok(back.messages.length > 0 && back.messages.length <= 120);
  assert.equal(back.messages[back.messages.length - 1].text, "消息 299");
});

test("配额超限：剥离过长附件正文以挤进存储", () => {
  const state = Core.createSeedState(new Date("2026-06-25T00:00:00Z"));
  state.messages = [
    {
      id: "m-att",
      role: "user",
      projectId: "p-first",
      createdAt: new Date("2026-06-25T00:00:00Z").toISOString(),
      text: "看附件",
      attachments: [{ id: "a1", kind: "text", name: "brief.txt", text: "x".repeat(12000) }],
    },
  ];
  const baseline = JSON.stringify(state).length;
  // 限到放不下完整 12000 字附件、但放得下剥离后版本
  const storage = makeQuotaStorage(baseline - 8000);
  const ok = Core.saveState(storage, state);
  assert.equal(ok, true);
  const back = Core.loadState(storage);
  const att = back.messages[0].attachments[0];
  assert.ok(att.text.length <= 800);
  assert.equal(att.truncated, true);
});

test("非配额错误（存储被禁用）：不抛出，返回 false", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("SecurityError: storage disabled");
    },
    removeItem: () => {},
  };
  let result;
  assert.doesNotThrow(() => {
    result = Core.saveState(storage, Core.createSeedState(new Date("2026-06-25T00:00:00Z")));
  });
  assert.equal(result, false);
});

console.log(`\nAll F4 persistence tests passed: ${passed}`);
