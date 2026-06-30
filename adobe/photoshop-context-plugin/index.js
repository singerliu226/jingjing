"use strict";

const photoshop = require("photoshop");
const { app, action, imaging } = photoshop;

let paused = false;
let notificationListener = null;
let sendTimer = 0;

function element(id) {
  return document.getElementById(id);
}

function unitValue(value) {
  if (value && Number.isFinite(Number(value.value))) return Number(value.value);
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function layerKind(layer) {
  return String(layer?.kind || layer?.typename || "unknown").slice(0, 80);
}

function flattenLayers(layers, parentId = "", output = [], depth = 0) {
  if (!layers || depth > 8 || output.length >= 200) return output;
  Array.from(layers).some((layer) => {
    if (output.length >= 200) return true;
    output.push({
      id: String(layer.id || ""),
      parentId: String(parentId || ""),
      name: String(layer.name || "").slice(0, 240),
      kind: layerKind(layer),
      visible: layer.visible !== false,
      opacity: unitValue(layer.opacity),
    });
    if (layer.layers) flattenLayers(layer.layers, layer.id, output, depth + 1);
    return false;
  });
  return output;
}

function readSelectionBounds(document) {
  try {
    const bounds = document.selection?.bounds;
    if (!bounds) return null;
    return {
      left: unitValue(bounds.left),
      top: unitValue(bounds.top),
      right: unitValue(bounds.right),
      bottom: unitValue(bounds.bottom),
    };
  } catch (error) {
    return null;
  }
}

function readDocumentContext() {
  const document = app.activeDocument;
  if (!document) return null;
  const activeLayers = Array.from(document.activeLayers || []);
  const layers = flattenLayers(document.layers);
  return {
    app: "photoshop",
    id: String(document.id || ""),
    name: String(document.title || "未命名文档").slice(0, 300),
    width: unitValue(document.width),
    height: unitValue(document.height),
    resolution: unitValue(document.resolution),
    colorMode: String(document.mode || "").slice(0, 80),
    layerCount: layers.length,
    activeLayerIds: activeLayers.map((layer) => String(layer.id || "")).filter(Boolean),
    activeLayerNames: activeLayers.map((layer) => String(layer.name || "")).filter(Boolean),
    selectionBounds: readSelectionBounds(document),
    layers,
  };
}

function readSettings() {
  return {
    projectId: element("project-id").value.trim(),
    baseUrl: element("bridge-url").value.trim().replace(/\/+$/, ""),
    token: element("bridge-token").value,
  };
}

function saveSettings() {
  const settings = readSettings();
  localStorage.setItem("jingjing-project-id", settings.projectId);
  localStorage.setItem("jingjing-bridge-url", settings.baseUrl);
  localStorage.setItem("jingjing-bridge-token", settings.token);
}

function updateDocumentCard() {
  const context = readDocumentContext();
  if (!context) {
    element("document-name").textContent = "尚未打开文档";
    element("document-meta").textContent = "打开一个 PSD 后可读取上下文";
    element("layer-meta").textContent = "";
    return;
  }
  element("document-name").textContent = context.name;
  element("document-meta").textContent =
    `${Math.round(context.width)} × ${Math.round(context.height)} · ${context.colorMode || "未知色彩模式"} · ${context.layerCount} 个图层`;
  element("layer-meta").textContent = context.activeLayerNames.length
    ? `当前图层：${context.activeLayerNames.slice(0, 3).join("、")}`
    : "当前没有活动图层";
}

function setStatus(message, isError = false) {
  element("status").textContent = message;
  element("status").style.color = isError ? "#e4a29b" : "#aaa79f";
}

async function captureCompositePreview(documentContext) {
  const longestEdge = Math.max(documentContext.width, documentContext.height, 1);
  const scale = Math.min(1, 960 / longestEdge);
  const targetSize = {
    width: Math.max(1, Math.round(documentContext.width * scale)),
    height: Math.max(1, Math.round(documentContext.height * scale)),
  };
  const result = await imaging.getPixels({
    documentID: Number(documentContext.id),
    targetSize,
    componentSize: 8,
    colorSpace: "RGB",
    colorProfile: "sRGB IEC61966-2.1",
    applyAlpha: true,
  });
  try {
    const base64 = await imaging.encodeImageData({ imageData: result.imageData, base64: true });
    return `data:image/jpeg;base64,${base64}`;
  } finally {
    result.imageData.dispose();
  }
}

async function sendContext(type = "active_document_changed", options = {}) {
  if (paused) return;
  const documentContext = readDocumentContext();
  if (!documentContext) {
    setStatus("请先打开一个 Photoshop 文档。", true);
    return;
  }
  const settings = readSettings();
  if (!settings.baseUrl) {
    setStatus("请填写 Bridge 地址。", true);
    return;
  }
  saveSettings();
  let previewDataUrl = "";
  if (options.includePreview) {
    setStatus("正在生成只读低清预览…");
    try {
      previewDataUrl = await captureCompositePreview(documentContext);
    } catch (error) {
      setStatus("低清预览没有生成，将只发送文档和图层上下文。", true);
    }
  }
  const headers = { "Content-Type": "application/json" };
  if (settings.token) headers.Authorization = `Bearer ${settings.token}`;
  const event = {
    schemaVersion: "context-event-v1",
    source: "photoshop",
    type,
    projectId: settings.projectId,
    createdAt: new Date().toISOString(),
    dedupeKey: [
      "photoshop",
      settings.projectId,
      type,
      documentContext.id,
      documentContext.activeLayerIds.join(","),
      Date.now(),
    ].join(":"),
    artifact: {
      id: `ps-${documentContext.id}`,
      name: documentContext.name,
      mimeType: "image/vnd.adobe.photoshop",
      width: documentContext.width,
      height: documentContext.height,
      previewDataUrl,
    },
    document: documentContext,
  };
  try {
    const response = await fetch(`${settings.baseUrl}/api/context-bridge/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    setStatus(payload.reason === "duplicate" ? "这个上下文已经发送过。" : "已发送；回到小画桌确认是否收进项目。");
  } catch (error) {
    setStatus(`没有连上 Bridge：${String(error.message || error).slice(0, 100)}`, true);
  }
}

function eventTypeFromPhotoshopEvent(eventName) {
  const name = String(eventName || "").toLowerCase();
  if (name === "open") return "document_opened";
  if (name === "save" || name === "saveas") return "document_saved";
  if (name === "close") return "document_closed";
  if (name === "select") return "selection_changed";
  return "active_document_changed";
}

function queueContextSend(type) {
  clearTimeout(sendTimer);
  sendTimer = setTimeout(() => {
    updateDocumentCard();
    sendContext(type);
  }, 450);
}

async function startListeners() {
  if (notificationListener) return;
  notificationListener = (eventName) => {
    if (!paused) queueContextSend(eventTypeFromPhotoshopEvent(eventName));
  };
  await action.addNotificationListener(
    [{ event: "open" }, { event: "save" }, { event: "saveAs" }, { event: "close" }, { event: "select" }],
    notificationListener
  );
}

function togglePaused() {
  paused = !paused;
  element("toggle-capture").textContent = paused ? "继续观察" : "暂停观察";
  element("capture-state").textContent = paused ? "已暂停" : "只读";
  element("capture-state").style.background = paused ? "#6b5438" : "#3e5540";
  setStatus(paused ? "已暂停，不再发送新事件。" : "已继续，只读监听关键事件。");
  if (!paused) {
    updateDocumentCard();
    queueContextSend("active_document_changed");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  element("project-id").value = localStorage.getItem("jingjing-project-id") || "";
  element("bridge-url").value = localStorage.getItem("jingjing-bridge-url") || "http://127.0.0.1:4174";
  element("bridge-token").value = localStorage.getItem("jingjing-bridge-token") || "";
  element("send-context").addEventListener("click", () =>
    sendContext("active_document_changed", { includePreview: element("include-preview").checked })
  );
  element("toggle-capture").addEventListener("click", togglePaused);
  ["project-id", "bridge-url", "bridge-token"].forEach((id) => element(id).addEventListener("change", saveSettings));
  updateDocumentCard();
  try {
    await startListeners();
    setStatus("只读监听已准备好。");
  } catch (error) {
    setStatus("事件监听没有启动，可以先使用“发送当前上下文”。", true);
  }
});
