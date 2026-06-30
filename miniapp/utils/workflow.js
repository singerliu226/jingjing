function activeProject(state) {
  return (
    (state.projects || []).find((project) => project.id === state.activeProjectId) ||
    (state.projects || [])[0] ||
    null
  );
}

function projectTasks(state, projectId) {
  return (state.tasks || []).filter(
    (task) =>
      task.projectId === projectId &&
      !/^补齐项目(详情|小纸条)/.test(task.title || "")
  );
}

function hasImageRound(state, projectId) {
  return (state.messages || []).some(
    (message) =>
      message.projectId === projectId &&
      (message.attachments || []).some((attachment) => attachment.kind === "image")
  );
}

function deriveStage(state, project) {
  if (!project) return null;
  const tasks = projectTasks(state, project.id);
  const active = tasks.find((task) => task.status !== "done");
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const messages = (state.messages || []).filter((message) => message.projectId === project.id);
  const checkedHandoff = messages.some((message) =>
    /交付检查|能不能发给客户|能否交付/.test(message.text || "")
  );
  if (project.status === "done" || (project.workflowReady && tasks.length && !active)) {
    return {
      label: "项目完成",
      title: "趁记得，留下一个判断",
      copy: "只记一个做对的判断和一个下次练习。",
      action: "reflect",
      actionText: "做个小复盘",
    };
  }
  if (!project.workflowReady) {
    return {
      label: "开始前",
      title: "先把需求说清楚",
      copy: "只要三步：做什么、交什么、有什么限制。",
      action: "setup",
      actionText: "补项目需求",
    };
  }
  if (/^(交付前|自检与导出)/.test(active?.title || "")) {
    return {
      label: `当前一步 · ${doneCount + 1}/${tasks.length}`,
      title: "交付前最后确认",
      copy: checkedHandoff
        ? "确认问题都处理完，再把最终文件发出去。"
        : "先判断能不能发，再检查格式、命名和源文件。",
      action: checkedHandoff ? "complete-task" : "handoff",
      actionText: checkedHandoff ? "已经交付" : "开始交付检查",
      taskId: active.id,
    };
  }
  if (/首版|设计/.test(active?.title || "")) {
    const reviewed = hasImageRound(state, project.id);
    return {
      label: reviewed ? "修改与复评" : `当前一步 · ${doneCount + 1}/${tasks.length}`,
      title: reviewed ? "先确认这轮有没有变好" : active.title,
      copy: reviewed
        ? "对照上轮目标判断；方向对了，再进入交付。"
        : active.nextAction,
      action: reviewed ? "complete-task" : "first-review",
      actionText: reviewed ? "这一轮改好了" : "上传首版",
      secondaryAction: reviewed ? "revision" : "",
      secondaryText: reviewed ? "上传新版复评" : "",
      taskId: active.id,
    };
  }
  return {
    label: `当前一步 · ${doneCount + 1}/${tasks.length}`,
    title: active?.title || "查看下一步",
    copy: active?.nextAction || "先完成这一小步。",
    action: "complete-task",
    actionText: "这一步做完了",
    taskId: active?.id || "",
  };
}

function applyWorkflow(state, project, workflow) {
  const next = { ...state, tasks: [...(state.tasks || [])] };
  if (!workflow.ready) return next;
  workflow.tasks.forEach((item) => {
    const id = `${project.id}-workflow-${item.key}`;
    const existing = next.tasks.find((task) => task.id === id);
    if (existing) Object.assign(existing, item, { id, projectId: project.id });
    else next.tasks.push({ ...item, id, projectId: project.id, feedbackIds: [] });
  });
  project.workflowReady = true;
  if (project.status !== "done") project.status = "designing";
  return next;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createProject() {
  return {
    id: uid("p"),
    name: "未命名设计项目",
    type: "设计项目",
    goal: "",
    requirements: "",
    progressNote: "",
    deliverables: [],
    dueDate: "",
    status: "todo",
    workflowReady: false,
    risks: ["缺少设计目标", "缺少交付物清单", "缺少截止时间"],
    versions: [],
    portfolio: {},
    detailStep: 0,
  };
}

module.exports = {
  activeProject,
  applyWorkflow,
  createProject,
  deriveStage,
  projectTasks,
  uid,
};
