(function () {
  "use strict";

  const Core = window.DesignDeskCore;
  const storage = window.localStorage;
  let state = Core.loadState(storage);
  let projectFilter = state.activeFilter || "all";
  let currentView = "workbench";
  let projectAnalysisTimer = 0;
  let projectAnalysisRun = 0;

  const nodes = {
    workbenchView: document.querySelector("#workbench-view"),
    portfolioView: document.querySelector("#portfolio-view"),
    libraryView: document.querySelector("#library-view"),
    projectList: document.querySelector("#project-list"),
    chatStream: document.querySelector("#chat-stream"),
    composer: document.querySelector("#composer"),
    messageInput: document.querySelector("#message-input"),
    activeProjectName: document.querySelector("#active-project-name"),
    activeProjectType: document.querySelector("#active-project-type"),
    todayList: document.querySelector("#today-list"),
    waitingList: document.querySelector("#waiting-list"),
    nextList: document.querySelector("#next-list"),
    riskList: document.querySelector("#risk-list"),
    todayCount: document.querySelector("#today-count"),
    waitingCount: document.querySelector("#waiting-count"),
    assistantAdvice: document.querySelector("#assistant-advice"),
    assistantSource: document.querySelector("#assistant-source"),
    saveProjectBtn: document.querySelector("#save-project-btn"),
    newProjectBtn: document.querySelector("#new-project-btn"),
    sortProjectsBtn: document.querySelector("#sort-projects-btn"),
    dailySummaryBtn: document.querySelector("#daily-summary-btn"),
    planDayBtn: document.querySelector("#plan-day-btn"),
    reviewBtn: document.querySelector("#review-btn"),
    riskAuditBtn: document.querySelector("#risk-audit-btn"),
    checklistBtn: document.querySelector("#checklist-btn"),
    portfolioBtn: document.querySelector("#portfolio-btn"),
    markWaiting: document.querySelector("#mark-waiting"),
    showAllTasks: document.querySelector("#show-all-tasks"),
    projectForm: document.querySelector("#project-form"),
    projectNameInput: document.querySelector("#project-name-input"),
    projectTypeInput: document.querySelector("#project-type-input"),
    projectDueInput: document.querySelector("#project-due-input"),
    projectGoalInput: document.querySelector("#project-goal-input"),
    projectAudienceInput: document.querySelector("#project-audience-input"),
    projectSceneInput: document.querySelector("#project-scene-input"),
    projectDeliverablesInput: document.querySelector("#project-deliverables-input"),
    portfolioPageList: document.querySelector("#portfolio-page-list"),
    portfolioGenerateAll: document.querySelector("#portfolio-generate-all"),
    libraryPageList: document.querySelector("#library-page-list"),
    libraryInsertTip: document.querySelector("#library-insert-tip"),
  };

  function persist() {
    Core.saveState(storage, state);
  }

  function render() {
    const active = Core.getProject(state, state.activeProjectId);
    if (!active) return;
    state.projects.forEach(syncProjectWork);
    renderProjectHeader(active);
    renderInsights(active);
    renderProjectForm(active);
    renderProjects();
    renderMessages();
    renderDashboard();
    renderPortfolioPage();
    renderLibraryPage();
    persist();
  }

  function renderProjectHeader(project) {
    nodes.activeProjectName.textContent = project.name;
    nodes.activeProjectType.textContent = `${project.type} · ${statusLabel(project.status)}`;
  }

  function renderInsights(project) {
    const insights = Core.getProjectInsights(state, project.id);
    nodes.assistantAdvice.textContent = humanizeAdvice(insights);
    nodes.assistantSource.textContent = `来源：${buildInsightSource(insights)}`;
  }

  function humanizeAdvice(insights) {
    if (insights.missing.length) {
      return `先把「${insights.missing[0]}」补上。信息清楚后，小画桌再帮菁菁排今天的任务。`;
    }
    return insights.nextStep;
  }

  function buildInsightSource(insights) {
    const source = [];
    if (insights.missing.length) source.push(`缺失字段：${insights.missing.slice(0, 3).join("、")}`);
    if (insights.deadline !== "未设截止") source.push(`截止状态：${insights.deadline}`);
    if (!source.length) source.push("当前任务状态和交付检查清单");
    return source.join("；");
  }

  function renderProjectForm(project) {
    nodes.projectNameInput.value = project.name || "";
    nodes.projectTypeInput.value = project.type || "";
    nodes.projectDueInput.value = project.dueDate || "";
    nodes.projectGoalInput.value = project.goal || "";
    nodes.projectAudienceInput.value = project.audience || "";
    nodes.projectSceneInput.value = project.scene || "";
    nodes.projectDeliverablesInput.value = (project.deliverables || []).join("、");
  }

  function renderProjects() {
    const projects = state.projects
      .filter((project) => filterProject(project, projectFilter))
      .slice();
    nodes.projectList.replaceChildren(
      ...projects.map((project) => {
        const button = el("button", {
          className: `project-card ${project.id === state.activeProjectId ? "is-active" : ""}`,
          type: "button",
          onclick: () => {
            state.activeProjectId = project.id;
            render();
          },
        });
        button.append(
          el("span", { className: `status-dot status-${project.status}` }),
          el("span", { className: "project-card-main" }, [
            el("strong", { textContent: project.name }),
            el("small", { textContent: `${project.type} · ${project.dueDate || "未设截止"}` }),
          ])
        );
        return button;
      })
    );
  }

  function renderMessages() {
    const activeId = state.activeProjectId;
    const visible = state.messages.filter((message) => message.projectId === activeId);
    nodes.chatStream.replaceChildren(
      ...visible.map((message) => {
        const wrapper = el("article", { className: `message message-${message.role}` });
        wrapper.append(
          el("div", { className: "avatar", textContent: message.role === "agent" ? "D" : "你" }),
          el("div", { className: "message-body" }, [
            el("div", {
              className: "message-meta",
              textContent: `${message.role === "agent" ? "小画桌" : "菁菁"} · ${formatTime(message.createdAt)}`,
            }),
            el("div", { className: "bubble", innerHTML: formatBubble(message.text) }),
          ])
        );
        return wrapper;
      })
    );
    nodes.chatStream.scrollTop = nodes.chatStream.scrollHeight;
  }

  function renderDashboard() {
    const dashboard = Core.getDashboard(state);
    const activeTasks = state.tasks.filter((task) => task.projectId === state.activeProjectId && task.status !== "done");
    const todayIds = new Set(dashboard.today.map((task) => task.id));
    const waitingIds = new Set(dashboard.waiting.map((task) => task.id));
    const nextTasks = activeTasks.filter((task) => !todayIds.has(task.id) && !waitingIds.has(task.id));
    const combinedTasks = uniqueTasks(dashboard.today.concat(dashboard.waiting, nextTasks)).slice(0, 6);
    nodes.todayCount.textContent = combinedTasks.length;
    nodes.waitingCount.textContent = dashboard.waiting.length;
    nodes.todayList.replaceChildren(...withEmpty(combinedTasks.map(renderPlanTask), "今天还没有安排。可以点左侧新建项目，或者在下方直接记一句需求。"));
    nodes.waitingList.replaceChildren(...withEmpty(dashboard.waiting.slice(0, 3).map(renderPlanTask), "没有等待确认，菁菁可以专心推进设计"));
    nodes.nextList.replaceChildren(...withEmpty(nextTasks.slice(0, 4).map(renderPlanTask), "暂时没有可推进任务"));
    const activeRisks = dashboard.risks.filter((risk) => risk.projectId === state.activeProjectId);
    nodes.riskList.replaceChildren(...withEmpty(activeRisks.slice(0, 4).map(renderRisk), "这个项目暂时没有需要确认的风险"));
  }

  function renderPlanTask(task) {
    const project = Core.getProject(state, task.projectId);
    const statusText = task.status === "waiting" ? "等确认" : task.priority === "high" ? "先做" : "可推进";
    const item = el("article", {
      className: `task-row plan-task priority-${task.priority}`,
    });
    item.append(
      el("span", { className: "task-check", textContent: task.status === "done" ? "✓" : "" }),
      el("span", { className: "task-text" }, [
        el("strong", { textContent: task.title }),
        el("small", { textContent: `${statusText} · ${project.name} · ${task.dueDate || "未设截止"} · ${task.nextAction}` }),
      ]),
      el("span", { className: "task-actions" }, [
        el("button", {
          className: "mini-action is-done",
          type: "button",
          textContent: "完成",
          onclick: () => completeTask(task.id),
        })
      ])
    );
    return item;
  }

  function renderTask(task) {
    const project = Core.getProject(state, task.projectId);
    const item = el("button", {
      className: `task-row priority-${task.priority}`,
      type: "button",
      onclick: () => {
        state.activeProjectId = task.projectId;
        render();
      },
    });
    item.append(
      el("span", { className: "task-check", textContent: task.status === "done" ? "✓" : "" }),
      el("span", { className: "task-text" }, [
        el("strong", { textContent: task.title }),
        el("small", { textContent: `${project.name} · ${task.dueDate || "待定"} · ${task.nextAction}` }),
      ])
    );
    return item;
  }

  function withEmpty(items, text) {
    if (items.length) return items;
    return [el("div", { className: "empty-state", textContent: text })];
  }

  function uniqueTasks(tasks) {
    const seen = new Set();
    return tasks.filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
  }

  function completeTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    state.activeProjectId = task.projectId;
    task.status = "done";
    addAgentMessage(`已完成：${task.title}\n小画桌已帮菁菁更新今日进度。下一步可以处理等待确认，或记录这次修改的版本变化。`);
  }

  function snoozeTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    state.activeProjectId = task.projectId;
    const base = task.dueDate ? new Date(task.dueDate) : new Date();
    base.setDate(base.getDate() + 1);
    task.dueDate = base.toISOString().slice(0, 10);
    task.priority = "normal";
    addAgentMessage(`已延后：${task.title}\n新的截止日期是 ${task.dueDate}。如果这是对外承诺事项，建议同步告知确认人。`);
  }

  function renderRisk(risk) {
    const item = el("button", {
      className: "risk-row",
      type: "button",
      onclick: () => {
        state.activeProjectId = risk.projectId;
        render();
      },
    });
    item.append(el("strong", { textContent: risk.projectName }), el("span", { textContent: risk.text }));
    return item;
  }

  function renderPortfolioPage() {
    nodes.portfolioPageList.replaceChildren(
      ...state.projects.map((project) => {
        const feedbackItems = state.feedback.filter((item) => item.projectId === project.id);
        const card = el("article", { className: "portfolio-page-card" });
        card.append(
          el("div", { className: "portfolio-score", textContent: `${project.portfolioScore}/100` }),
          el("div", { className: "portfolio-page-body" }, [
            el("h4", { textContent: project.name }),
            el("p", { textContent: project.portfolio.problem || project.goal || "还需要补充设计问题和目标。" }),
            el("small", { textContent: `反馈 ${feedbackItems.length} 条 · 交付物 ${project.deliverables.length} 项` }),
          ]),
          el("button", {
            className: "mini-action is-done",
            type: "button",
            textContent: "整理",
            onclick: () => {
              state.activeProjectId = project.id;
              showView("workbench");
              addAgentMessage(Core.generatePortfolioCase(project, feedbackItems));
            },
          })
        );
        return card;
      })
    );
  }

  function renderLibraryPage() {
    const items = [
      ["太普通", "增强视觉记忆点，提高主标题对比，加入明确视觉锚点。"],
      ["太暗", "提高整体明度和关键元素对比，检查背景是否压住信息。"],
      ["更年轻", "使用更轻快配色、更大留白和更灵动的图形节奏。"],
      ["更高级", "减少装饰，统一字体和色彩数量，强化留白与细节克制。"],
      ["看不清", "检查字号、行距、对比度和移动端安全区。"],
      ["不够突出", "重新建立信息层级，放大主标题或主视觉。"],
    ];
    nodes.libraryPageList.replaceChildren(
      ...items.map(([term, action]) => {
        const card = el("button", {
          className: "library-card",
          type: "button",
          onclick: () => {
            showView("workbench");
            nodes.messageInput.value = `反馈：画面${term}。`;
            nodes.messageInput.focus();
          },
        });
        card.append(el("strong", { textContent: term }), el("span", { textContent: action }));
        return card;
      })
    );
  }

  async function submitMessage(text) {
    const clean = normalize(text);
    if (!clean) return;
    const modelIntent = await askQwenIntent(clean);
    const previousMessageCount = state.messages.length;
    const result = Core.applyInput(state, clean, new Date(), { intent: modelIntent });
    nodes.messageInput.value = "";
    render();
    if (result && shouldKeepLocalReply(result.analysis)) return;
    await askQwen(clean, previousMessageCount, result ? result.analysis : null);
  }

  async function askQwenIntent(message) {
    try {
      const project = Core.getProject(state, state.activeProjectId);
      const dashboard = Core.getDashboard(state);
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2500);
      const response = await fetch(`${getApiBase()}/api/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          currentDate: getLocalDateString(),
          project,
          dashboard: {
            todayCount: dashboard.today.length,
            waitingCount: dashboard.waiting.length,
            riskCount: dashboard.risks.length,
          },
          recentMessages: state.messages
            .filter((item) => item.projectId === state.activeProjectId)
            .slice(Math.max(0, state.messages.length - 8)),
        }),
      });
      window.clearTimeout(timer);
      const payload = await response.json();
      if (!response.ok || payload.error) return null;
      return payload.intent || null;
    } catch (error) {
      return null;
    }
  }

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shouldKeepLocalReply(analysis) {
    if (!analysis) return false;
    const localOnlyBehaviors = [
      "ask_plan",
      "ask_summary",
      "ask_checklist",
      "ask_portfolio",
      "project_retrospective",
      "record_project_outcome",
      "generate_growth_profile",
      "cancel_task",
      "complete_checklist",
      "snooze_task",
      "summarize_version_changes",
      "clear_waiting",
      "mark_feedback_handled",
      "record_version",
      "update_deadline",
      "update_brief",
      "update_project_name",
      "update_project_type",
      "update_project_specs",
    ];
    return localOnlyBehaviors.includes(analysis.behavior);
  }

  async function askQwen(message, previousMessageCount, analysis) {
    const agentMessage = state.messages[previousMessageCount + 1];
    if (!agentMessage || agentMessage.role !== "agent") return;
    const fallbackReply = agentMessage.text;
    const visibleLocalReply = getVisibleLocalReply(fallbackReply, analysis);
    agentMessage.text = composePendingModelReply(visibleLocalReply);
    render();
    try {
      const project = Core.getProject(state, state.activeProjectId);
      const dashboard = Core.getDashboard(state);
      const response = await fetch(`${getApiBase()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          localReply: fallbackReply,
          project,
          dashboard: {
            todayCount: dashboard.today.length,
            waitingCount: dashboard.waiting.length,
            riskCount: dashboard.risks.length,
          },
          recentMessages: state.messages
            .filter((item) => item.projectId === state.activeProjectId)
            .slice(Math.max(0, state.messages.length - 8)),
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error || "千问请求失败");
      agentMessage.text = composeModelReply(visibleLocalReply, payload.reply);
    } catch (error) {
      agentMessage.text = composeModelErrorReply(visibleLocalReply, error);
    }
    render();
  }

  function getVisibleLocalReply(localReply, analysis) {
    if (!shouldShowLocalUpdateWithModelReply(analysis)) return "";
    return localReply;
  }

  function shouldShowLocalUpdateWithModelReply(analysis) {
    if (!analysis) return false;
    return [
      "record_feedback",
      "create_project",
      "record_note",
      "update_deliverables",
      "complete_progress",
      "waiting_confirmation",
    ].includes(analysis.behavior);
  }

  function composePendingModelReply(localReply) {
    if (!localReply) return "正在请千问生成更贴合上下文的下一步建议...";
    return `已先整理：\n${localReply}\n\n正在请千问生成更贴合上下文的下一步建议...`;
  }

  function composeModelReply(localReply, modelReply) {
    const cleanModelReply = normalize(modelReply);
    if (!cleanModelReply) return localReply;
    if (!localReply) return cleanModelReply;
    return `已先整理：\n${localReply}\n\n千问建议：\n${cleanModelReply}`;
  }

  function composeModelErrorReply(localReply, error) {
    if (!localReply) return `千问暂时没有连上：${error.message}。可以先继续记录下一条，我会保留本地兜底。`;
    return `已先整理：\n${localReply}\n\n千问暂时没有连上：${error.message}。本地整理结果已保留，可以继续记录下一条。`;
  }

  function getApiBase() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") return "";
    return window.localStorage.getItem("design-desk-api-base") || "http://localhost:4174";
  }

  function fillQuickTemplate(template) {
    const active = Core.getProject(state, state.activeProjectId);
    const examples = {
      "主管反馈：": `主管反馈：${active.name} 画面`,
      "新需求：": `新需求：${active.name} 需要`,
      "我完成了：": `我完成了：${active.name} 的`,
      "等待确认：": `等待确认：${active.name} 的`,
    };
    nodes.messageInput.value = examples[template] || template;
    nodes.messageInput.focus();
  }

  function addAgentMessage(text) {
    state.messages.push({
      id: `m-${Date.now()}`,
      role: "agent",
      projectId: state.activeProjectId,
      createdAt: new Date().toISOString(),
      text,
    });
    render();
  }

  function createNewProject() {
    const projectId = `p-${Date.now()}`;
    const project = {
      id: projectId,
      name: "未命名设计项目",
      type: "设计项目",
      source: "菁菁",
      goal: "",
      audience: "",
      scene: "",
      keywords: [],
      deliverables: [],
      dueDate: "",
      status: "todo",
      portfolioScore: 35,
      risks: ["缺少设计目标", "缺少交付物清单", "缺少截止时间"],
      versions: [],
      portfolio: {
        background: "",
        problem: "",
        strategy: "",
        process: "",
        result: "",
        reflection: "",
        interviewScript: "",
      },
    };
    state.projects.unshift(project);
    state.tasks.push({
      id: `t-${Date.now()}`,
      projectId,
      title: "补齐项目小纸条：目标、截止时间、交付物",
      priority: "high",
      dueDate: "",
      status: "todo",
      nextAction: "先在右侧写清楚做什么、什么时候交、最后交哪些图",
      feedbackIds: [],
    });
    state.checklist.push(
      { id: `c-${Date.now()}-1`, projectId, label: "确认尺寸、用途和交付格式", done: false, group: "规格" },
      { id: `c-${Date.now()}-2`, projectId, label: "检查主信息层级和移动端可读性", done: false, group: "可读性" },
      { id: `c-${Date.now()}-3`, projectId, label: "整理源文件、导出文件和命名", done: false, group: "交付" }
    );
    state.activeProjectId = projectId;
    showView("workbench");
    addAgentMessage("新项目已创建。先在右侧「项目小纸条」写清楚：做什么、什么时候交、最后要交哪些图。小画桌会据此重新安排今天要做的事。");
  }

  function sortProjects() {
    state.projects.sort((a, b) => {
      const riskDiff = b.risks.length - a.risks.length;
      if (riskDiff) return riskDiff;
      return String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
    });
    render();
  }

  function auditRisks() {
    state.projects.forEach((project) => {
      if (!project.dueDate && !project.risks.includes("缺少截止时间")) project.risks.push("缺少截止时间");
      if (!project.deliverables.length && !project.risks.includes("缺少交付物清单")) project.risks.push("缺少交付物清单");
      if (!project.goal && !project.risks.includes("缺少设计目标")) project.risks.push("缺少设计目标");
    });
    addAgentMessage("已完成风险扫描：我重点检查了设计目标、截止时间、交付物、反馈冲突和等待确认事项。右侧风险提醒已更新。");
  }

  function showChecklist() {
    const project = Core.getProject(state, state.activeProjectId);
    const items = state.checklist.filter((item) => item.projectId === project.id);
    addAgentMessage(`交付检查：${project.name}\n${items.map((item) => `${item.done ? "✓" : "□"} ${item.label}`).join("\n")}`);
  }

  function markWaitingSummary() {
    const project = Core.getProject(state, state.activeProjectId);
    const dashboard = Core.getDashboard(state);
    if (!dashboard.waiting.length && !project.risks.length) {
      addAgentMessage("现在没有明显等待确认事项。");
      return;
    }
    addAgentMessage(Core.generateConfirmationMessage(state, project, "帮我整理等待确认的话术"));
  }

  function showAllTasks() {
    const project = Core.getProject(state, state.activeProjectId);
    const tasks = state.tasks.filter((task) => task.projectId === project.id);
    if (!tasks.length) {
      addAgentMessage("这个项目还没有任务。你可以先输入一条需求或反馈，我会帮你整理出待办。");
      return;
    }
    addAgentMessage(`项目任务清单：${project.name}\n${tasks.map((task) => `- ${statusLabel(task.status)}｜${task.title}｜${task.dueDate || "待定"}`).join("\n")}`);
  }

  function updateActiveProjectFromForm() {
    const project = Core.getProject(state, state.activeProjectId);
    const preservedRisks = project.risks.filter((risk) => !risk.startsWith("缺少"));
    project.name = nodes.projectNameInput.value.trim() || "未命名设计项目";
    project.type = nodes.projectTypeInput.value.trim() || "设计项目";
    project.dueDate = nodes.projectDueInput.value;
    project.goal = nodes.projectGoalInput.value.trim();
    project.audience = nodes.projectAudienceInput.value.trim();
    project.scene = nodes.projectSceneInput.value.trim();
    project.deliverables = splitList(nodes.projectDeliverablesInput.value);
    project.risks = Array.from(new Set(buildProjectRisks(project).concat(preservedRisks)));
    syncProjectWork(project);
    renderProjectHeader(project);
    renderInsights(project);
    renderProjects();
    renderDashboard();
    persist();
    scheduleProjectAnalysis(project.id);
  }

  function splitList(value) {
    return String(value || "")
      .split(/[、,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function buildProjectRisks(project) {
    const risks = [];
    if (!project.goal) risks.push("缺少设计目标");
    if (!project.deliverables.length) risks.push("缺少交付物清单");
    if (!project.dueDate) risks.push("缺少截止时间");
    return risks;
  }

  function updateProjectBriefTask(project) {
    const task = state.tasks.find((item) => item.projectId === project.id && item.title.startsWith("补齐项目小纸条"));
    project.risks = project.risks.filter((risk) => {
      if (risk === "缺少设计目标" && project.goal) return false;
      if (risk === "缺少交付物清单" && project.deliverables.length) return false;
      if (risk === "缺少截止时间" && project.dueDate) return false;
      return true;
    });
    if (!task) return;
    const hasBaseInfo = project.goal && project.deliverables.length && project.dueDate;
    task.status = hasBaseInfo ? "done" : "todo";
    task.nextAction = hasBaseInfo ? "可以开始设计或记录下一条反馈" : "先在右侧写清楚做什么、什么时候交、最后交哪些图";
  }

  function syncProjectWork(project) {
    updateProjectBriefTask(project);
    state.tasks
      .filter((task) => task.projectId === project.id && task.status !== "done" && task.status !== "waiting")
      .forEach((task) => {
        if (!task.dueDate && project.dueDate) task.dueDate = project.dueDate;
        if (project.dueDate && task.nextAction.includes("截止时间")) {
          task.nextAction = task.nextAction
            .replace("、截止时间", "")
            .replace("截止时间、", "")
            .replace("截止时间", "")
            .replace(/：、/g, "：")
            .replace(/：$/, "：继续确认反馈人和交付细节");
        }
      });
  }

  function scheduleProjectAnalysis(projectId) {
    window.clearTimeout(projectAnalysisTimer);
    const project = Core.getProject(state, projectId);
    nodes.saveProjectBtn.textContent = isProjectReadyForWorkflow(project) ? "已保存，准备整理" : "已自动保存";
    if (!isProjectReadyForWorkflow(project)) return;
    projectAnalysisTimer = window.setTimeout(() => analyzeProjectFromCard(projectId), 900);
  }

  function isProjectReadyForWorkflow(project) {
    return Boolean(project && project.name && project.type && project.goal && project.dueDate && project.deliverables.length);
  }

  function projectWorkflowFingerprint(project) {
    return [project.id, project.name, project.type, project.dueDate, project.goal, project.deliverables.join("|")].join("::");
  }

  async function analyzeProjectFromCard(projectId) {
    const project = Core.getProject(state, projectId);
    if (!project || !isProjectReadyForWorkflow(project)) return;
    const fingerprint = projectWorkflowFingerprint(project);
    if (project.workflowFingerprint === fingerprint) {
      nodes.saveProjectBtn.textContent = "已整理工作流";
      return;
    }
    const runId = ++projectAnalysisRun;
    project.workflowFingerprint = fingerprint;
    nodes.saveProjectBtn.textContent = "正在整理";
    const workflow = Core.generateProjectWorkflow(project, new Date());
    applyWorkflowTasks(project, workflow);
    const messageId = `m-workflow-${Date.now()}`;
    state.messages.push({
      id: messageId,
      role: "agent",
      projectId: project.id,
      createdAt: new Date().toISOString(),
      text: `${workflow.summary}\n\n正在请千问根据项目小纸条补充更细的安排...`,
    });
    render();
    await askQwenForProjectWorkflow(project.id, messageId, workflow.summary, runId);
  }

  function applyWorkflowTasks(project, workflow) {
    workflow.tasks.forEach((item) => {
      const taskId = `${project.id}-workflow-${item.key}`;
      const existing = state.tasks.find((task) => task.id === taskId);
      if (existing) {
        existing.title = item.title;
        existing.dueDate = item.dueDate;
        existing.priority = item.priority;
        existing.nextAction = item.nextAction;
        if (existing.status === "done" && !workflow.ready) existing.status = "todo";
      } else {
        state.tasks.push({
          id: taskId,
          projectId: project.id,
          title: item.title,
          priority: item.priority,
          dueDate: item.dueDate,
          status: item.status,
          nextAction: item.nextAction,
          feedbackIds: [],
        });
      }
    });
    if (workflow.ready && project.status !== "done") project.status = "designing";
    syncProjectWork(project);
  }

  async function askQwenForProjectWorkflow(projectId, messageId, fallbackReply, runId) {
    try {
      const project = Core.getProject(state, projectId);
      const dashboard = Core.getDashboard(state);
      const response = await fetch(`${getApiBase()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "project_workflow",
          message: [
            "请根据我刚填写的项目小纸条，分析这个设计项目，并安排一个可执行工作流。",
            "请重点说明：项目判断、今日先做、后续步骤、需要确认、交付风险。",
            "不要假设已经完成的结果，不要编造客户反馈。",
          ].join("\n"),
          project,
          dashboard: {
            todayCount: dashboard.today.length,
            waitingCount: dashboard.waiting.length,
            riskCount: dashboard.risks.length,
          },
          recentMessages: state.messages
            .filter((item) => item.projectId === projectId)
            .slice(Math.max(0, state.messages.length - 8)),
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error || "千问请求失败");
      if (runId !== projectAnalysisRun) return;
      const message = state.messages.find((item) => item.id === messageId);
      if (message) message.text = payload.reply || fallbackReply;
      nodes.saveProjectBtn.textContent = "已整理工作流";
    } catch (error) {
      const message = state.messages.find((item) => item.id === messageId);
      if (message) message.text = `${fallbackReply}\n\n千问暂时没有连上：${error.message}。本地工作流已先更新。`;
      nodes.saveProjectBtn.textContent = "已本地整理";
    }
    render();
  }

  function showView(view) {
    currentView = view;
    nodes.workbenchView.classList.toggle("is-active", view === "workbench");
    nodes.portfolioView.classList.toggle("is-active", view === "portfolio");
    nodes.libraryView.classList.toggle("is-active", view === "library");
    document.querySelectorAll(".view-link").forEach((item) => item.classList.toggle("is-active", item.dataset.panel === view));
    renderPortfolioPage();
    renderLibraryPage();
  }

  function filterProject(project, filter) {
    if (filter === "active") return project.status === "designing" || project.status === "todo";
    if (filter === "waiting") return project.status === "waiting";
    if (filter === "done") return project.status === "done";
    return true;
  }

  function statusLabel(status) {
    return {
      todo: "未开始",
      designing: "设计中",
      waiting: "待确认",
      done: "已完成",
    }[status] || "进行中";
  }

  function formatTime(value) {
    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function formatBubble(text) {
    return escapeHtml(text)
      .split("\n")
      .map((line) => (line.startsWith("- ") ? `<p class="bullet-line">${line}</p>` : `<p>${line}</p>`))
      .join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value || "").trim();
  }

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (key === "className") node.className = value;
      else if (key === "textContent") node.textContent = value;
      else if (key === "innerHTML") node.innerHTML = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value !== undefined && value !== null) node[key] = value;
    });
    const list = Array.isArray(children) ? children : [children];
    list.filter(Boolean).forEach((child) => node.append(child));
    return node;
  }

  nodes.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMessage(nodes.messageInput.value);
  });

  nodes.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage(nodes.messageInput.value);
    }
  });

  document.querySelectorAll(".filter-tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      projectFilter = button.dataset.filter;
      state.activeFilter = projectFilter;
      renderProjects();
    });
  });

  document.querySelectorAll(".quick-action").forEach((button) => {
    button.addEventListener("click", () => fillQuickTemplate(button.dataset.template));
  });

  document.querySelectorAll(".view-link").forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.panel);
    });
  });

  nodes.newProjectBtn.addEventListener("click", createNewProject);
  nodes.sortProjectsBtn.addEventListener("click", sortProjects);
  nodes.dailySummaryBtn.addEventListener("click", () => addAgentMessage(Core.generateDailySummary(state)));
  nodes.planDayBtn.addEventListener("click", () => addAgentMessage(Core.generateDailyPlan(state)));
  nodes.reviewBtn.addEventListener("click", () => {
    const project = Core.getProject(state, state.activeProjectId);
    addAgentMessage(Core.generateReview(project, state.feedback.filter((item) => item.projectId === project.id)));
  });
  nodes.riskAuditBtn.addEventListener("click", auditRisks);
  nodes.checklistBtn.addEventListener("click", showChecklist);
  nodes.markWaiting.addEventListener("click", markWaitingSummary);
  nodes.showAllTasks.addEventListener("click", showAllTasks);
  nodes.portfolioBtn.addEventListener("click", () => {
    const project = Core.getProject(state, state.activeProjectId);
    addAgentMessage(Core.generatePortfolioCase(project, state.feedback.filter((item) => item.projectId === project.id)));
  });
  nodes.projectForm.addEventListener("input", updateActiveProjectFromForm);
  nodes.portfolioGenerateAll.addEventListener("click", () => {
    const project = Core.getProject(state, state.activeProjectId);
    showView("workbench");
    addAgentMessage(Core.generatePortfolioCase(project, state.feedback.filter((item) => item.projectId === project.id)));
  });
  nodes.libraryInsertTip.addEventListener("click", () => {
    showView("workbench");
    nodes.messageInput.value = "反馈：画面太普通，希望更高级一点。";
    nodes.messageInput.focus();
  });

  render();
})();
