"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const SCHEMA_VERSION = "context-event-v1";
const MAX_EVENTS = 300;
const MAX_PREVIEW_CHARS = 1_800_000;
const ALLOWED_SOURCES = new Set(["browser_folder", "photoshop", "illustrator", "figma", "generated_tool"]);
const ALLOWED_TYPES = new Set([
  "file_created",
  "file_saved",
  "file_renamed",
  "file_exported",
  "document_opened",
  "document_saved",
  "document_closed",
  "selection_changed",
  "active_document_changed",
]);
const ALLOWED_STATUSES = new Set(["pending", "imported", "dismissed"]);

function cleanText(value, maxLength = 240) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanNumber(value, maximum = 1_000_000_000) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(number, maximum)) : 0;
}

function defaultData() {
  return {
    schemaVersion: 1,
    paused: false,
    updatedAt: new Date(0).toISOString(),
    events: [],
  };
}

function normalizeArtifact(value) {
  const artifact = value && typeof value === "object" ? value : {};
  const previewDataUrl =
    typeof artifact.previewDataUrl === "string" &&
    /^data:image\/(?:png|jpeg|webp);base64,/i.test(artifact.previewDataUrl) &&
    artifact.previewDataUrl.length <= MAX_PREVIEW_CHARS
      ? artifact.previewDataUrl
      : "";
  return {
    id: cleanText(artifact.id, 120),
    name: cleanText(artifact.name || artifact.fileName, 300),
    relativePath: cleanText(artifact.relativePath, 600),
    mimeType: cleanText(artifact.mimeType, 100),
    size: cleanNumber(artifact.size, 2_000_000_000),
    lastModified: cleanNumber(artifact.lastModified, 10_000_000_000_000),
    fingerprint: cleanText(artifact.fingerprint, 180),
    fingerprintMode: cleanText(artifact.fingerprintMode, 40),
    width: cleanNumber(artifact.width, 100_000),
    height: cleanNumber(artifact.height, 100_000),
    previewDataUrl,
  };
}

function normalizeDocument(value) {
  const document = value && typeof value === "object" ? value : {};
  return {
    app: cleanText(document.app, 60),
    id: cleanText(document.id, 120),
    name: cleanText(document.name, 300),
    width: cleanNumber(document.width, 100_000),
    height: cleanNumber(document.height, 100_000),
    resolution: cleanNumber(document.resolution, 10_000),
    colorMode: cleanText(document.colorMode, 80),
    layerCount: cleanNumber(document.layerCount, 100_000),
    activeLayerIds: Array.isArray(document.activeLayerIds)
      ? document.activeLayerIds.slice(0, 40).map((item) => cleanText(item, 120)).filter(Boolean)
      : [],
    activeLayerNames: Array.isArray(document.activeLayerNames)
      ? document.activeLayerNames.slice(0, 40).map((item) => cleanText(item, 240)).filter(Boolean)
      : [],
    selectionBounds:
      document.selectionBounds && typeof document.selectionBounds === "object"
        ? {
            left: cleanNumber(document.selectionBounds.left, 100_000),
            top: cleanNumber(document.selectionBounds.top, 100_000),
            right: cleanNumber(document.selectionBounds.right, 100_000),
            bottom: cleanNumber(document.selectionBounds.bottom, 100_000),
          }
        : null,
    layers: Array.isArray(document.layers)
      ? document.layers.slice(0, 200).map((layer) => ({
          id: cleanText(layer?.id, 120),
          parentId: cleanText(layer?.parentId, 120),
          name: cleanText(layer?.name, 240),
          kind: cleanText(layer?.kind, 80),
          visible: layer?.visible !== false,
          opacity: cleanNumber(layer?.opacity, 100),
        }))
      : [],
  };
}

function normalizeEvent(value, now = new Date()) {
  const event = value && typeof value === "object" ? value : {};
  const source = cleanText(event.source, 60);
  const type = cleanText(event.type, 80);
  if (!ALLOWED_SOURCES.has(source)) throw new Error("不支持的 Bridge 事件来源。");
  if (!ALLOWED_TYPES.has(type)) throw new Error("不支持的 Bridge 事件类型。");
  const artifact = normalizeArtifact(event.artifact);
  const document = normalizeDocument(event.document);
  if (!artifact.name && !document.name) throw new Error("Bridge 事件缺少文件或文档名称。");
  const createdAt = Number.isFinite(Date.parse(event.createdAt)) ? new Date(event.createdAt).toISOString() : now.toISOString();
  const dedupeMaterial = [
    source,
    type,
    cleanText(event.projectId, 120),
    artifact.relativePath || artifact.name,
    artifact.fingerprint,
    document.id,
    createdAt.slice(0, 19),
  ].join("|");
  return {
    id: cleanText(event.id, 120) || `bridge-${crypto.randomUUID()}`,
    schemaVersion: SCHEMA_VERSION,
    source,
    type,
    projectId: cleanText(event.projectId, 120),
    createdAt,
    receivedAt: now.toISOString(),
    status: ALLOWED_STATUSES.has(event.status) ? event.status : "pending",
    dedupeKey: cleanText(event.dedupeKey, 180) || crypto.createHash("sha256").update(dedupeMaterial).digest("hex"),
    artifact,
    document,
  };
}

function normalizeData(value) {
  const base = defaultData();
  if (!value || typeof value !== "object") return base;
  const events = Array.isArray(value.events)
    ? value.events
        .filter((event) => event && typeof event === "object" && ALLOWED_SOURCES.has(event.source) && ALLOWED_TYPES.has(event.type))
        .slice(-MAX_EVENTS)
    : [];
  return {
    schemaVersion: 1,
    paused: Boolean(value.paused),
    updatedAt: Number.isFinite(Date.parse(value.updatedAt)) ? new Date(value.updatedAt).toISOString() : base.updatedAt,
    events,
  };
}

function createContextBridge(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  function read() {
    try {
      return normalizeData(JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch (error) {
      if (error.code === "ENOENT") return defaultData();
      throw error;
    }
  }

  function write(data) {
    const next = normalizeData(data);
    next.updatedAt = new Date().toISOString();
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporaryPath, filePath);
    return next;
  }

  function mutate(callback) {
    const data = read();
    const result = callback(data);
    write(data);
    return result;
  }

  function ingest(value, now = new Date()) {
    const event = normalizeEvent(value, now);
    return mutate((data) => {
      if (data.paused) return { accepted: false, reason: "paused", event: null };
      const existing = data.events.find((item) => item.dedupeKey === event.dedupeKey);
      if (existing) return { accepted: false, reason: "duplicate", event: existing };
      data.events.push(event);
      data.events = data.events.slice(-MAX_EVENTS);
      return { accepted: true, reason: "", event };
    });
  }

  function list(filters = {}) {
    const data = read();
    let events = data.events.slice().reverse();
    if (filters.projectId) events = events.filter((event) => event.projectId === filters.projectId);
    if (filters.status && ALLOWED_STATUSES.has(filters.status)) {
      events = events.filter((event) => event.status === filters.status);
    }
    const limit = Math.max(1, Math.min(Number(filters.limit) || 50, 100));
    return { paused: data.paused, events: events.slice(0, limit), updatedAt: data.updatedAt };
  }

  function act(eventId, action) {
    if (!["import", "dismiss"].includes(action)) throw new Error("不支持的候选操作。");
    return mutate((data) => {
      const event = data.events.find((item) => item.id === eventId);
      if (!event) return null;
      event.status = action === "import" ? "imported" : "dismissed";
      event.actionAt = new Date().toISOString();
      return event;
    });
  }

  function control(action) {
    if (!["pause", "resume", "clear"].includes(action)) throw new Error("不支持的 Bridge 控制操作。");
    return mutate((data) => {
      if (action === "pause") data.paused = true;
      if (action === "resume") data.paused = false;
      if (action === "clear") data.events = [];
      return { paused: data.paused, eventCount: data.events.length };
    });
  }

  return { filePath, ingest, list, act, control, read };
}

module.exports = {
  SCHEMA_VERSION,
  ALLOWED_SOURCES,
  ALLOWED_TYPES,
  createContextBridge,
  normalizeEvent,
};
