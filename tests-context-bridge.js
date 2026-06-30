"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createContextBridge, normalizeEvent } = require("./bridge/context-bridge.js");

function run() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "design-desk-bridge-"));
  const bridge = createContextBridge(path.join(directory, "events.json"));
  const input = {
    source: "browser_folder",
    type: "file_saved",
    projectId: "p-test",
    createdAt: "2026-06-30T08:00:00.000Z",
    dedupeKey: "p-test:poster:sha256-demo",
    artifact: {
      name: "poster-v2.png",
      relativePath: "exports/poster-v2.png",
      mimeType: "image/png",
      size: 1200,
      lastModified: 1782806400000,
      fingerprint: "sha256:demo",
      fingerprintMode: "sha256",
      previewDataUrl: "data:image/png;base64,AA==",
    },
  };

  const first = bridge.ingest(input);
  assert.equal(first.accepted, true);
  assert.equal(first.event.status, "pending");
  assert.equal(bridge.list({ projectId: "p-test", status: "pending" }).events.length, 1);

  const duplicate = bridge.ingest(input);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "duplicate");

  assert.equal(bridge.act(first.event.id, "import").status, "imported");
  assert.equal(bridge.list({ projectId: "p-test", status: "pending" }).events.length, 0);

  bridge.control("pause");
  const paused = bridge.ingest({ source: "photoshop", type: "document_saved", artifact: { name: "poster.psd" } });
  assert.equal(paused.accepted, false);
  assert.equal(paused.reason, "paused");
  bridge.control("resume");
  assert.equal(bridge.read().paused, false);

  assert.throws(
    () => normalizeEvent({ source: "screen_recorder", type: "file_saved", artifact: { name: "secret.png" } }),
    /来源/
  );
  assert.throws(
    () => normalizeEvent({ source: "photoshop", type: "document_mutated", artifact: { name: "poster.psd" } }),
    /类型/
  );

  bridge.control("clear");
  assert.equal(bridge.list().events.length, 0);
  fs.rmSync(directory, { recursive: true, force: true });
  console.log("Context Bridge tests passed.");
}

run();
