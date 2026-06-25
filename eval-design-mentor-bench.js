const assert = require("node:assert/strict");
const fs = require("node:fs");

const bench = JSON.parse(fs.readFileSync("evals/design-mentor-bench.json", "utf8"));
const appSource = fs.readFileSync("app.js", "utf8");
const serverSource = fs.readFileSync("server.js", "utf8");
const stylesSource = fs.readFileSync("styles.css", "utf8");
const docSource = fs.readFileSync("docs/design-agent-bench-and-improvement.md", "utf8");

assert.equal(bench.schemaVersion, "design-mentor-bench-v1");
assert.ok(Array.isArray(bench.samples), "bench samples should be an array");
assert.ok(bench.samples.length >= 12, "first bench should include at least 12 samples");

const sampleIds = new Set();
const stages = new Set();
const redlines = new Set();
let imageAttachmentSamples = 0;

bench.samples.forEach((sample) => {
  assert.ok(sample.id, "sample id is required");
  assert.ok(!sampleIds.has(sample.id), `duplicate sample id: ${sample.id}`);
  sampleIds.add(sample.id);
  assert.ok([1, 2, 3].includes(sample.stage), `${sample.id} stage should be 1, 2, or 3`);
  stages.add(sample.stage);
  assert.ok(sample.type, `${sample.id} type is required`);
  assert.ok(sample.user, `${sample.id} user input is required`);
  assert.ok(sample.expected, `${sample.id} expected block is required`);
  assert.ok(Array.isArray(sample.expected.mustInclude), `${sample.id} mustInclude should be an array`);
  assert.ok(sample.expected.mustInclude.includes("核心判断"), `${sample.id} should require a visible core judgment`);
  assert.ok(Array.isArray(sample.expected.qualitySignals), `${sample.id} qualitySignals should be an array`);
  assert.ok(sample.expected.qualitySignals.length >= 2, `${sample.id} should include at least two quality signals`);
  assert.ok(Array.isArray(sample.expected.avoid), `${sample.id} avoid should be an array`);
  assert.ok(Array.isArray(sample.metrics) && sample.metrics.length > 0, `${sample.id} should activate metrics`);
  assert.ok(Array.isArray(sample.redlines), `${sample.id} redlines should be an array`);
  sample.redlines.forEach((item) => redlines.add(item));
  if (Array.isArray(sample.attachments) && sample.attachments.some((attachment) => attachment.kind === "image")) {
    imageAttachmentSamples += 1;
    sample.attachments.forEach((attachment) => {
      assert.equal(attachment.kind, "image", `${sample.id} attachment should be image-only for visual bench`);
      assert.ok(attachment.fixture, `${sample.id} image fixture is required`);
      assert.ok(fs.existsSync(attachment.fixture), `${sample.id} image fixture should exist: ${attachment.fixture}`);
    });
  }
});

assert.deepEqual([...stages].sort(), [1, 2, 3], "bench should cover all three stages");
assert.ok(bench.samples.length >= 17, "bench should include text and image boundary samples");
assert.ok(imageAttachmentSamples >= 4, "bench should include real screenshot attachment samples");
["R1", "R2", "R3", "R4", "R5", "R6"].forEach((redline) => {
  assert.ok(redlines.has(redline), `bench should cover ${redline}`);
});

[
  "设计咨询必须用成长型 mentor 结构",
  "格式固定为：核心判断、优先动作、为什么、验收标准",
  "优先动作最多 3 条",
  "没有截图、Figma 节点、明确规格",
  "WCAG AA 最小字号 14px",
  "上轮目标对照",
  "可以发/暂不建议发",
  "function isSensitiveErrorDisclosureRequest",
  "function buildSanitizedErrorReply",
  "不要输出“我已整理/我已同步/我记录到”",
  "function shouldUseDesignMentorContract",
].forEach((needle) => {
  assert.ok(serverSource.includes(needle), `server prompt contract missing: ${needle}`);
});

[
  "analysis: analysis",
  "核心判断|最大问题|第一眼看到什么|项目判断|设计判断",
  "为什么|判断依据|设计理由",
  "验收标准|自查标准|改完看什么",
  "上轮目标对照",
].forEach((needle) => {
  assert.ok(appSource.includes(needle), `app mentor rendering missing: ${needle}`);
});
assert.ok(stylesSource.includes(".answer-check"), "mentor acceptance-card style missing: .answer-check");

[
  "DesignMentorBench",
  "Stage_1 = Mean(DQS, FSS, UCS, RGS)",
  "R1 胡乱识图",
  "Quality_Score >= 7.5",
].forEach((needle) => {
  assert.ok(docSource.includes(needle), `bench design doc missing: ${needle}`);
});

console.log(`DesignMentorBench static checks passed: ${bench.samples.length} samples.`);
