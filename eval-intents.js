const assert = require("node:assert/strict");
const fs = require("node:fs");
const Core = require("./core.js");

const suite = JSON.parse(fs.readFileSync("evals/intent-samples.json", "utf8"));
const fixedNow = new Date(`${suite.currentDate}T09:00:00+08:00`);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function makeModelIntent(sample) {
  const expected = sample.expected;
  const entities = { ...(expected.entities || {}) };
  if (entities.feedback) {
    const feedback = entities.feedback;
    entities.feedback = {
      raw: asArray(feedback.rawIncludes).join("，") || sample.text,
      action: asArray(feedback.actionIncludes).join("，") || "按反馈拆成具体修改动作。",
      reason: "评估样例提供的结构化反馈。",
      conflict: Boolean(feedback.conflict),
    };
  }
  return {
    schemaVersion: "llm-intent-v1",
    intent: expected.intent,
    confidence: 0.9,
    summary: sample.text,
    entities,
    missing: asArray(expected.missingContains),
    nextAction: "根据结构化意图继续推进。",
    reason: "评估样例。",
  };
}

function includesAll(actual, expectedItems, label, id) {
  expectedItems.forEach((item) => {
    assert.ok(
      actual.some((actualItem) => String(actualItem).includes(item) || item.includes(String(actualItem))),
      `${id}: expected ${label} to include ${item}; got ${JSON.stringify(actual)}`
    );
  });
}

function assertEntities(id, analysis, expectedEntities = {}) {
  if (expectedEntities.projectName) assert.equal(analysis.projectName, expectedEntities.projectName, `${id}: projectName`);
  if (expectedEntities.projectType) assert.equal(analysis.typeLabel, expectedEntities.projectType, `${id}: projectType`);
  if (expectedEntities.source) assert.equal(analysis.from, expectedEntities.source, `${id}: source`);
  if (expectedEntities.dueDate) assert.equal(analysis.dueDate, expectedEntities.dueDate, `${id}: dueDate`);
  if (expectedEntities.status) assert.equal(analysis.status, expectedEntities.status, `${id}: status`);
  if (expectedEntities.goal) assert.equal(analysis.brief.goal, expectedEntities.goal, `${id}: goal`);
  if (expectedEntities.audience) assert.equal(analysis.brief.audience, expectedEntities.audience, `${id}: audience`);
  if (expectedEntities.scene) assert.equal(analysis.brief.scene, expectedEntities.scene, `${id}: scene`);
  if (expectedEntities.deliverables) includesAll(analysis.deliverables, expectedEntities.deliverables, "deliverables", id);
  if (expectedEntities.specs) includesAll(analysis.meta.specs || [], expectedEntities.specs, "specs", id);
  if (expectedEntities.formats) includesAll(analysis.meta.formats || [], expectedEntities.formats, "formats", id);
  if (expectedEntities.feedback) {
    assert.ok(analysis.feedback, `${id}: expected feedback`);
    includesAll([analysis.feedback.raw], asArray(expectedEntities.feedback.rawIncludes), "feedback.raw", id);
    includesAll([analysis.feedback.action], asArray(expectedEntities.feedback.actionIncludes), "feedback.action", id);
  }
}

function assertEffects(id, state, expectedEffects = {}) {
  const project = Core.getProject(state, state.activeProjectId);
  if (expectedEffects.activeProjectName) assert.equal(project.name, expectedEffects.activeProjectName, `${id}: activeProjectName`);
  if (expectedEffects.projectStatus) assert.equal(project.status, expectedEffects.projectStatus, `${id}: projectStatus`);
  if (expectedEffects.projectDueDate) assert.equal(project.dueDate, expectedEffects.projectDueDate, `${id}: projectDueDate`);
  if (expectedEffects.feedbackRecorded) {
    assert.ok(state.feedback.some((item) => item.projectId === project.id), `${id}: expected feedback to be recorded`);
  }
  if (expectedEffects.taskCreated) {
    assert.ok(state.tasks.some((task) => task.projectId === project.id && task.id !== "t-first"), `${id}: expected task to be created`);
  }
  if (expectedEffects.checklistCreated) {
    assert.ok(state.checklist.some((item) => item.projectId === project.id), `${id}: expected checklist to be created`);
  }
}

assert.equal(suite.schemaVersion, "llm-intent-evals-v1");
assert.ok(Array.isArray(suite.samples), "samples must be an array");
assert.ok(suite.samples.length >= 50, "intent eval seed set should contain at least 50 samples");

const seen = new Set();
suite.samples.forEach((sample) => {
  assert.ok(sample.id, "sample id is required");
  assert.ok(!seen.has(sample.id), `duplicate sample id: ${sample.id}`);
  seen.add(sample.id);
  assert.ok(sample.text, `${sample.id}: text is required`);
  assert.ok(sample.expected && sample.expected.intent, `${sample.id}: expected.intent is required`);

  const state = Core.createSeedState(fixedNow);
  const result = Core.applyInput(state, sample.text, fixedNow, { intent: makeModelIntent(sample) });
  assert.equal(result.analysis.behavior, sample.expected.intent, `${sample.id}: behavior`);
  assert.equal(result.analysis.modelIntent.schemaVersion, "llm-intent-v1", `${sample.id}: schemaVersion`);
  assert.equal(result.analysis.modelIntent.source, "model", `${sample.id}: model source`);
  assertEntities(sample.id, result.analysis, sample.expected.entities || {});
  includesAll(result.analysis.missing || [], asArray(sample.expected.missingContains), "missing", sample.id);
  assertEffects(sample.id, state, sample.expected.effects || {});
});

console.log(`Intent eval samples passed: ${suite.samples.length}`);
