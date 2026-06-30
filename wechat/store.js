"use strict";

const fs = require("node:fs");
const path = require("node:path");

function defaultData() {
  return {
    schemaVersion: 1,
    users: {},
    states: {},
    bindTickets: {},
    notificationJobs: {},
  };
}

function normalizeData(value) {
  const base = defaultData();
  if (!value || typeof value !== "object") return base;
  return {
    schemaVersion: 1,
    users: value.users && typeof value.users === "object" ? value.users : {},
    states: value.states && typeof value.states === "object" ? value.states : {},
    bindTickets: value.bindTickets && typeof value.bindTickets === "object" ? value.bindTickets : {},
    notificationJobs:
      value.notificationJobs && typeof value.notificationJobs === "object"
        ? value.notificationJobs
        : {},
  };
}

function createStore(filePath) {
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
    const temp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temp, filePath);
    return next;
  }

  function mutate(callback) {
    const data = read();
    const result = callback(data);
    write(data);
    return result;
  }

  return { filePath, read, write, mutate };
}

module.exports = { createStore, defaultData };
