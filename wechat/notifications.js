"use strict";

const crypto = require("node:crypto");

const DEFAULT_PREFERENCES = {
  dueSoon: true,
  waiting: true,
  dailyPlan: false,
  dailyHour: 9,
};

function formatDateTime(value) {
  if (!value) return "时间待确认";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function jobId(userId, projectId, kind, marker) {
  return crypto
    .createHash("sha256")
    .update([userId, projectId, kind, marker].join("|"))
    .digest("hex")
    .slice(0, 32);
}

function normalizePreferences(value) {
  return {
    ...DEFAULT_PREFERENCES,
    ...(value && typeof value === "object" ? value : {}),
    dailyHour: Math.max(0, Math.min(23, Number(value?.dailyHour ?? 9))),
  };
}

function buildNotificationJobs(userId, state, preferences, now = new Date()) {
  const prefs = normalizePreferences(preferences);
  const projects = Array.isArray(state?.projects) ? state.projects : [];
  const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
  const jobs = [];
  const nowMs = now.getTime();

  projects.forEach((project) => {
    if (!project || project.status === "done") return;
    const projectTasks = tasks.filter(
      (task) => task.projectId === project.id && task.status !== "done"
    );
    const nextTask = projectTasks.find((task) => task.status !== "waiting") || projectTasks[0];

    if (prefs.dueSoon && project.dueDate) {
      const dueAt = new Date(`${project.dueDate}T18:00:00+08:00`);
      const delta = dueAt.getTime() - nowMs;
      if (delta <= 24 * 60 * 60 * 1000 && delta > -24 * 60 * 60 * 1000) {
        jobs.push({
          id: jobId(userId, project.id, "due-soon", project.dueDate),
          userId,
          projectId: project.id,
          kind: "due-soon",
          dueAt: new Date(Math.min(dueAt.getTime(), nowMs)).toISOString(),
          title: `${project.name}临近截止`,
          time: formatDateTime(dueAt),
          action: nextTask?.nextAction || nextTask?.title || "打开小画桌检查交付状态",
          status: "pending",
          attempts: 0,
        });
      }
    }

    const waitingTask = projectTasks.find((task) => task.status === "waiting");
    if (prefs.waiting && waitingTask) {
      const marker = `${waitingTask.id}:${waitingTask.dueDate || "no-date"}`;
      jobs.push({
        id: jobId(userId, project.id, "waiting", marker),
        userId,
        projectId: project.id,
        kind: "waiting",
        dueAt: now.toISOString(),
        title: `${project.name}等待确认`,
        time: formatDateTime(now),
        action: waitingTask.nextAction || waitingTask.title,
        status: "pending",
        attempts: 0,
      });
    }

    if (prefs.dailyPlan && projectTasks.length) {
      const day = now.toISOString().slice(0, 10);
      const sendAt = new Date(now);
      sendAt.setHours(prefs.dailyHour, 0, 0, 0);
      jobs.push({
        id: jobId(userId, project.id, "daily-plan", day),
        userId,
        projectId: project.id,
        kind: "daily-plan",
        dueAt: sendAt.toISOString(),
        title: `${project.name}今天先做`,
        time: formatDateTime(sendAt),
        action: nextTask?.nextAction || nextTask?.title || "打开小画桌查看下一步",
        status: "pending",
        attempts: 0,
      });
    }
  });

  return jobs;
}

function enqueueJobs(store, userId, state, preferences, now = new Date()) {
  const candidates = buildNotificationJobs(userId, state, preferences, now);
  store.mutate((data) => {
    candidates.forEach((job) => {
      if (!data.notificationJobs[job.id]) data.notificationJobs[job.id] = job;
    });
  });
  return candidates;
}

async function processJobs(store, client, now = new Date()) {
  const data = store.read();
  const dueJobs = Object.values(data.notificationJobs).filter(
    (job) =>
      job.status === "pending" &&
      new Date(job.dueAt).getTime() <= now.getTime() &&
      Number(job.attempts || 0) < 3
  );
  const results = [];

  for (const job of dueJobs) {
    const user = data.users[job.userId];
    if (!user?.oaOpenId) {
      results.push({ id: job.id, status: "skipped", reason: "not-bound" });
      continue;
    }
    try {
      const response = await client.sendTemplateMessage({
        openId: user.oaOpenId,
        projectId: job.projectId,
        title: job.title,
        time: job.time,
        action: job.action,
      });
      store.mutate((next) => {
        next.notificationJobs[job.id] = {
          ...next.notificationJobs[job.id],
          status: "sent",
          sentAt: new Date().toISOString(),
          msgId: response.msgid || "",
        };
      });
      results.push({ id: job.id, status: "sent" });
    } catch (error) {
      store.mutate((next) => {
        const current = next.notificationJobs[job.id];
        next.notificationJobs[job.id] = {
          ...current,
          attempts: Number(current.attempts || 0) + 1,
          lastError: String(error.message || error).slice(0, 180),
        };
      });
      results.push({ id: job.id, status: "failed", reason: error.message });
    }
  }
  return results;
}

module.exports = {
  DEFAULT_PREFERENCES,
  buildNotificationJobs,
  enqueueJobs,
  normalizePreferences,
  processJobs,
};
